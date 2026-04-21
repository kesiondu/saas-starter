import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/payments/stripe"
import {
  findPlanByCode,
  findPlanByStripePriceId,
  findSubscriptionByStripeId,
  setSubscriptionStatus,
  upsertUserSubscription,
} from "@/lib/db/queries/subscriptions"
import { grantCredits } from "@/lib/db/queries/credits"
import { getPlanByCode } from "@/config/plans"
import { getPackageByCode } from "@/config/credit-packages"
import { CreditSourceType } from "@/lib/db/schema"

export const runtime = "nodejs"

function parseUserId(val: string | null | undefined) {
  if (!val) return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const type = session.metadata?.type
  const userId = parseUserId(session.metadata?.userId)
  if (!userId) {
    console.error("[stripe.webhook] checkout missing userId", session.id)
    return
  }

  if (type === "credit_pack") {
    const packageCode = session.metadata?.packageCode
    if (!packageCode) return
    const pack = getPackageByCode(packageCode)
    if (!pack) {
      console.error("[stripe.webhook] unknown packageCode", packageCode)
      return
    }
    await grantCredits({
      userId,
      credits: pack.credits,
      validityDays: pack.validityDays,
      sourceType: CreditSourceType.PURCHASE,
      sourceRef: session.payment_intent?.toString() ?? session.id,
    })
    console.log(
      `[stripe.webhook] credit pack granted user=${userId} code=${packageCode}`,
    )
  }
  // 订阅类型的首次完成由 customer.subscription.created/updated + invoice.paid 处理
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const userId = parseUserId(sub.metadata?.userId)
  if (!userId) {
    console.error("[stripe.webhook] subscription missing userId metadata", sub.id)
    return
  }

  // 解析 planCode / priceId
  const item = sub.items.data[0]
  const priceId = item?.price.id
  const planCodeMeta = sub.metadata?.planCode

  let plan = planCodeMeta ? await findPlanByCode(planCodeMeta) : undefined
  if (!plan && priceId) {
    plan = await findPlanByStripePriceId(priceId)
  }
  if (!plan) {
    console.error("[stripe.webhook] plan not found", {
      priceId,
      planCodeMeta,
    })
    return
  }

  await upsertUserSubscription({
    userId,
    planId: plan.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
  })
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await setSubscriptionStatus(sub.id, {
    status: "canceled",
    canceledAt: new Date(),
    cancelAtPeriodEnd: false,
  })
}

/**
 * 发放订阅周期积分：每次 invoice.paid 触发一次。
 * 使用 invoice.id 作为 sourceRef，避免重复发放（DB 层不做唯一约束，但下游幂等）。
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id
  if (!subscriptionId) return

  const existing = await findSubscriptionByStripeId(subscriptionId)
  if (!existing) {
    console.error(
      "[stripe.webhook] invoice.paid for unknown subscription",
      subscriptionId,
    )
    return
  }

  // 从 line_items 取 priceId -> planCode
  const lineItem = invoice.lines.data.find((l) => l.price?.recurring)
  const priceId = lineItem?.price?.id
  if (!priceId) return

  const planRow = await findPlanByStripePriceId(priceId)
  if (!planRow) return
  const planConfig = getPlanByCode(planRow.planCode as "free" | "pro" | "premium")
  if (!planConfig || planConfig.creditsPerMonth <= 0) return

  await grantCredits({
    userId: existing.userId,
    credits: planConfig.creditsPerMonth,
    validityDays: planConfig.creditValidityDays,
    sourceType: CreditSourceType.SUBSCRIPTION,
    sourceRef: `invoice:${invoice.id}`,
  })
  console.log(
    `[stripe.webhook] subscription credits granted user=${existing.userId} plan=${planRow.planCode}`,
  )
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.error("[stripe.webhook] signature verification failed:", err)
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      default:
        // 其它事件忽略
        break
    }
  } catch (err) {
    console.error("[stripe.webhook] handler error:", err)
    return NextResponse.json({ error: "handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
