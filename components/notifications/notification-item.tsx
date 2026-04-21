"use client"

import Link from "next/link"
import { useTransition } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationType, type Notification } from "@/lib/db/schema"
import { markNotificationReadAction } from "@/app/(app)/notifications/actions"

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

function Icon({ type }: { type: string }) {
  if (type === NotificationType.TASK_FAILED) {
    return (
      <XCircle
        className="size-4 shrink-0 text-destructive"
        aria-hidden="true"
      />
    )
  }
  return (
    <CheckCircle2
      className="size-4 shrink-0 text-muted-foreground"
      aria-hidden="true"
    />
  )
}

export function NotificationItem({
  notification,
}: {
  notification: Notification
}) {
  const [pending, startTransition] = useTransition()
  const href = notification.relatedTaskId
    ? `/tasks/${notification.relatedTaskId}`
    : "#"

  const handleClick = () => {
    if (notification.isRead) return
    startTransition(() => {
      void markNotificationReadAction(notification.id)
    })
  }

  return (
    <li
      className={cn(
        "transition-colors",
        !notification.isRead && "bg-muted/40",
      )}
    >
      <Link
        href={href}
        onClick={handleClick}
        className="flex items-start gap-3 px-5 py-4 hover:bg-muted/60"
      >
        <Icon type={notification.type} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {notification.title}
            </p>
            {!notification.isRead ? (
              <span
                aria-label="Unread"
                className="size-1.5 shrink-0 rounded-full bg-primary"
              />
            ) : null}
          </div>
          {notification.content ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {notification.content}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {dateFormatter.format(notification.createdAt)}
            {pending ? " · marking…" : null}
          </p>
        </div>
      </Link>
    </li>
  )
}
