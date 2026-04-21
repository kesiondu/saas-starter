import "server-only"
import { stripe } from "./stripe"
import { setUserStripeCustomerId } from "@/lib/db/queries/users"
import type { User } from "@/lib/db/schema"

/**
 * 确保用户已在 Stripe 上创建 Customer，并把 customerId 回填到 users 表。
 */
export async function ensureStripeCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: String(user.id) },
  })
  await setUserStripeCustomerId(user.id, customer.id)
  return customer.id
}

interface CheckoutBase {
  user: User
  successUrl: string
  cancelUrl: string
}

interface SubscriptionCheckoutInput extends CheckoutBase {
  priceId: string
  planCode: string
}

/** 创建订阅 Checkout Session */
export async function createSubscriptionCheckout(
  input: SubscriptionCheckoutInput,
) {
  const customerId = await ensureStripeCustomer(input.user)
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: true,
    client_reference_id: String(input.user.id),
    metadata: {
      userId: String(input.user.id),
      type: "subscription",
      planCode: input.planCode,
    },
    subscription_data: {
      metadata: {
        userId: String(input.user.id),
        planCode: input.planCode,
      },
    },
  })
}

interface CreditPackCheckoutInput extends CheckoutBase {
  priceId: string
  packageCode: string
}

/** 创建积分包一次性支付 Checkout Session */
export async function createCreditPackCheckout(input: CreditPackCheckoutInput) {
  const customerId = await ensureStripeCustomer(input.user)
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    allow_promotion_codes: true,
    client_reference_id: String(input.user.id),
    payment_intent_data: {
      metadata: {
        userId: String(input.user.id),
        type: "credit_pack",
        packageCode: input.packageCode,
      },
    },
    metadata: {
      userId: String(input.user.id),
      type: "credit_pack",
      packageCode: input.packageCode,
    },
  })
}

/** 创建 Customer Portal Session（取消/升级/支付方式管理） */
export async function createBillingPortalSession(
  user: User,
  returnUrl: string,
) {
  const customerId = await ensureStripeCustomer(user)
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
