import { CircleUserRound } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { requireUser } from "@/lib/auth/session"

export const metadata = { title: "Dashboard · AI Video Editor" }

export default async function DashboardPage() {
  const user = await requireUser()

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h1 className="text-2xl font-semibold text-foreground">
            {user.name ?? user.email}
          </h1>
        </div>
        <SignOutButton variant="outline" />
      </header>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="size-14">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>
              <CircleUserRound className="size-6 text-muted-foreground" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
        Subscription, credits, and tasks will appear here once those modules
        are wired up.
      </section>
    </main>
  )
}
