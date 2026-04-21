import "server-only"
import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  // 在构建阶段不报错，运行时使用时才抛出
  console.warn("[stripe] STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
  typescript: true,
})

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ""
