import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlanCard, DisabledPlanButton } from "@/components/billing/plan-card"
import { CreditPackCard } from "@/components/billing/credit-pack-card"
import { SubscribeButton } from "@/components/billing/subscribe-button"
import { SUBSCRIPTION_PLANS } from "@/config/plans"
import { CREDIT_PACKAGES } from "@/config/credit-packages"
import { getCurrentUser } from "@/lib/auth/session"
import { getActiveUserSubscription } from "@/lib/db/queries/subscriptions"
import {
  startSubscriptionCheckout,
  startCreditPackCheckout,
} from "@/app/(app)/billing/actions"

export const metadata = {
  title: "Pricing · AI Video Editor",
  description: "Pick a plan or buy credit packs on demand.",
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const user = await getCurrentUser()
  const activeSub = user ? await getActiveUserSubscription(user.id) : null
  const currentPlanCode = activeSub?.plan?.planCode ?? null

  const sortedPlans = [...SUBSCRIPTION_PLANS].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const sortedPacks = [...CREDIT_PACKAGES].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            AI Video Editor
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Pricing built for creators
          </h1>
          <p className="mt-3 text-muted-foreground text-pretty">
            Start free, upgrade when you need more. Credits never need a cron
            job to expire — we just check the clock at query time.
          </p>
        </div>

        {sp?.status === "canceled" ? (
          <div className="mx-auto mt-8 max-w-2xl rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground">
            Checkout canceled. No charge was made.
          </div>
        ) : null}

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {sortedPlans.map((plan) => {
            const hasPrice = !!plan.stripePriceId
            const isCurrent = currentPlanCode === plan.code
            const action = !user ? (
              <Link href="/login?callbackUrl=/pricing" className="w-full">
                <Button className="w-full">Sign in to subscribe</Button>
              </Link>
            ) : isCurrent ? (
              <DisabledPlanButton label="Current plan" />
            ) : !hasPrice ? (
              <DisabledPlanButton label={plan.priceMonthly === 0 ? "Default" : "Unavailable"} />
            ) : (
              <SubscribeButton
                action={startSubscriptionCheckout}
                payload={{ planCode: plan.code }}
                label={activeSub ? "Switch plan" : "Subscribe"}
                variant={plan.isPopular ? "default" : "outline"}
              />
            )

            return (
              <PlanCard
                key={plan.code}
                plan={plan}
                currentPlanCode={currentPlanCode}
                action={action}
              />
            )
          })}
        </div>

        <div className="mt-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Need more credits?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Top up anytime. Purchased credits expire on their own schedule
              without touching your subscription balance.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedPacks.map((pack) => {
              const action = !user ? (
                <Link
                  href="/login?callbackUrl=/pricing"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full">
                    Sign in to buy
                  </Button>
                </Link>
              ) : !pack.stripePriceId ? (
                <Button disabled variant="outline" className="w-full">
                  Unavailable
                </Button>
              ) : (
                <SubscribeButton
                  action={startCreditPackCheckout}
                  payload={{ packageCode: pack.code }}
                  label="Buy pack"
                  variant="outline"
                />
              )
              return (
                <CreditPackCard key={pack.code} pack={pack} action={action} />
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
