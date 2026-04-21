"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { requireUser } from "@/lib/auth/session"
import { getPlanByCode } from "@/config/plans"
import { getPackageByCode } from "@/config/credit-packages"
import {
  createSubscriptionCheckout,
  createCreditPackCheckout,
  createBillingPortalSession,
} from "@/lib/payments/checkout"

function getBaseUrl() {
  const envUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  return "http://localhost:3000"
}

async function resolveBaseUrl() {
  // 优先使用显式环境变量；否则从请求头推断
  const base = getBaseUrl()
  if (base !== "http://localhost:3000") return base
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  return host ? `${proto}://${host}` : base
}

/** 开始订阅 Checkout */
export async function startSubscriptionCheckout(formData: FormData) {
  const planCode = String(formData.get("planCode") ?? "")
  const plan = getPlanByCode(planCode as "free" | "pro" | "premium")
  if (!plan || !plan.stripePriceId) {
    throw new Error(`Plan "${planCode}" 未配置 Stripe Price ID`)
  }

  const user = await requireUser()
  const baseUrl = await resolveBaseUrl()
  const session = await createSubscriptionCheckout({
    user,
    priceId: plan.stripePriceId,
    planCode: plan.code,
    successUrl: `${baseUrl}/billing?status=success`,
    cancelUrl: `${baseUrl}/pricing?status=canceled`,
  })
  redirect(session.url!)
}

/** 开始积分包购买 */
export async function startCreditPackCheckout(formData: FormData) {
  const packageCode = String(formData.get("packageCode") ?? "")
  const pack = getPackageByCode(packageCode)
  if (!pack || !pack.stripePriceId) {
    throw new Error(`Package "${packageCode}" 未配置 Stripe Price ID`)
  }

  const user = await requireUser()
  const baseUrl = await resolveBaseUrl()
  const session = await createCreditPackCheckout({
    user,
    priceId: pack.stripePriceId,
    packageCode: pack.code,
    successUrl: `${baseUrl}/billing?status=success`,
    cancelUrl: `${baseUrl}/billing?status=canceled`,
  })
  redirect(session.url!)
}

/** 打开 Stripe Customer Portal */
export async function openBillingPortal() {
  const user = await requireUser()
  const baseUrl = await resolveBaseUrl()
  const session = await createBillingPortalSession(
    user,
    `${baseUrl}/billing`,
  )
  redirect(session.url)
}
