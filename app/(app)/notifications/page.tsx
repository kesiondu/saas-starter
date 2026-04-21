import { Bell } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button"
import { NotificationItem } from "@/components/notifications/notification-item"
import { requireUser } from "@/lib/auth/session"
import { listUserNotifications } from "@/lib/db/queries/notifications"

export const metadata = { title: "Notifications · AI Video Editor" }

export default async function NotificationsPage() {
  const user = await requireUser()
  const notifications = await listUserNotifications(user.id, { limit: 50 })
  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates from your tasks and account.
          </p>
        </div>
        <MarkAllReadButton hasUnread={hasUnread} />
      </header>

      {notifications.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" aria-hidden="true" />
              No notifications
            </CardTitle>
            <CardDescription>
              You&apos;ll see task updates and account alerts here.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </div>
  )
}
