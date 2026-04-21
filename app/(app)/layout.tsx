import Link from "next/link"
import type { ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { requireUser } from "@/lib/auth/session"
import { getUserAvailableCredits } from "@/lib/db/queries/credits"
import { countUnreadNotifications } from "@/lib/db/queries/notifications"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/billing", label: "Billing" },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const [credits, unread] = await Promise.all([
    getUserAvailableCredits(user.id),
    countUnreadNotifications(user.id),
  ])

  const initials = (user.name ?? user.email ?? "U")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              AI Video Editor
            </Link>
            <nav className="flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
              title="Available credits"
            >
              {credits} credits
            </span>
            <NotificationBell unreadCount={unread} />
            <Avatar className="size-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <SignOutButton variant="ghost" size="sm" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}
