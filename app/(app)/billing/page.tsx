import Link from "next/link"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CreditPackCard } from "@/components/billing/credit-pack-card"
import { SubscribeButton } from "@/components/billing/subscribe-button"
import { CREDIT_PACKAGES } from "@/config/credit-packages"
import { getPlanByCode } from "@/config/plans"
import { requireUser } from "@/lib/auth/session"
import { getUserAvailableCredits } from "@/lib/db/queries/credits"
import { getActiveUserSubscription } from "@/lib/db/queries/subscriptions"
import {
  openBillingPortal,
  startCreditPackCheckout,
} from "./actions"

export const metadata = { title: "Billing · AI Video Editor" }

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatStatus(status: string) {
  const label =
    {
      active: "Active",
      trialing: "Trialing",
      past_due: "Past due",
      canceled: "Canceled",
      paused: "Paused",
    }[status] ?? status

  const variant: "default" | "secondary" | "destructive" =
    status === "active" || status === "trialing"
      ? "default"
      : status === "past_due"
        ? "destructive"
        : "secondary"

  return <Badge variant={variant}>{label}</Badge>
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const sp = await searchParams
  const user = await requireUser()
  const [credits, activeSub] = await Promise.all([
    getUserAvailableCredits(user.id),
    getActiveUserSubscription(user.id),
  ])

  const currentPlanConfig = activeSub?.plan
    ? getPlanByCode(activeSub.plan.planCode as "free" | "pro" | "premium")
    : null

  const sortedPacks = [...CREDIT_PACKAGES].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Manage your subscription and top up credits.
          </p>
        </div>
        <Link href="/pricing">
          <Button variant="outline" size="sm">
            See all plans
          </Button>
        </Link>
      </header>

      {sp?.status === "success" ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Payment successful. It may take a moment for credits to appear.</p>
        </div>
      ) : sp?.status === "canceled" ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-muted px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Checkout canceled. You have not been charged.</p>
        </div>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>
              Monthly credits are granted on each billing cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSub && currentPlanConfig ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{currentPlanConfig.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentPlanConfig.creditsPerMonth} credits / month
                    </p>
                  </div>
                  {formatStatus(activeSub.status)}
                </div>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Current period</dt>
                  <dd className="text-right">
                    {formatDate(activeSub.currentPeriodStart)} –{" "}
                    {formatDate(activeSub.currentPeriodEnd)}
                  </dd>
                  <dt className="text-muted-foreground">Renewal</dt>
                  <dd className="text-right">
                    {activeSub.cancelAtPeriodEnd
                      ? `Cancels on ${formatDate(activeSub.currentPeriodEnd)}`
                      : formatDate(activeSub.currentPeriodEnd)}
                  </dd>
                </dl>
                <form action={openBillingPortal}>
                  <Button type="submit" variant="outline" className="w-full">
                    Manage in Stripe
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You are on the free tier. Upgrade to unlock more monthly
                  credits and advanced features.
                </p>
                <Link href="/pricing" className="block">
                  <Button className="w-full">Choose a plan</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credits balance</CardTitle>
            <CardDescription>
              Across subscription grants and purchased packs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">{credits}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              credits available
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Top up credits
            </h2>
            <p className="text-sm text-muted-foreground">
              Purchased credits never expire until their own validity ends.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPacks.map((pack) => (
            <CreditPackCard
              key={pack.code}
              pack={pack}
              action={
                pack.stripePriceId ? (
                  <SubscribeButton
                    action={startCreditPackCheckout}
                    payload={{ packageCode: pack.code }}
                    label="Buy pack"
                    variant="outline"
                  />
                ) : (
                  <Button disabled variant="outline" className="w-full">
                    Unavailable
                  </Button>
                )
              }
            />
          ))}
        </div>
      </section>
    </div>
  )
}
