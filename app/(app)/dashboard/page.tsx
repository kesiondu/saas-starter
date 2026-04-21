import Link from "next/link"
import { CircleUserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireUser } from "@/lib/auth/session"
import { getUserAvailableCredits } from "@/lib/db/queries/credits"
import { getActiveUserSubscription } from "@/lib/db/queries/subscriptions"
import { getPlanByCode } from "@/config/plans"

export const metadata = { title: "Dashboard · AI Video Editor" }

export default async function DashboardPage() {
  const user = await requireUser()
  const [credits, activeSub] = await Promise.all([
    getUserAvailableCredits(user.id),
    getActiveUserSubscription(user.id),
  ])
  const planConfig = activeSub?.plan
    ? getPlanByCode(activeSub.plan.planCode as "free" | "pro" | "premium")
    : null

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Welcome back
            {user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your studio
          </h1>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credits</CardTitle>
            <CardDescription>Available right now</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{credits}</p>
            <Link
              href="/billing"
              className="mt-2 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Manage billing
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan</CardTitle>
            <CardDescription>Current subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {planConfig?.name ?? "Free"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {planConfig
                ? `${planConfig.creditsPerMonth} credits / month`
                : "No active subscription"}
            </p>
            <Link href="/pricing" className="mt-3 inline-block">
              <Button size="sm" variant="outline">
                {activeSub ? "Change plan" : "Upgrade"}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Signed in via OAuth</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Avatar className="size-10">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>
                <CircleUserRound className="size-5 text-muted-foreground" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name ?? user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-dashed border-border p-10 text-center">
        <h2 className="text-lg font-semibold">Start a new edit</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a model and describe the video you want to generate.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/tasks/new">New video task</Link>
        </Button>
      </section>
    </div>
  )
}
