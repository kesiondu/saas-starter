"use client"

import { useTransition } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markAllNotificationsReadAction } from "@/app/(app)/notifications/actions"

export function MarkAllReadButton({ hasUnread }: { hasUnread: boolean }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!hasUnread || pending}
      onClick={() =>
        startTransition(() => {
          void markAllNotificationsReadAction()
        })
      }
    >
      <Check className="size-4" />
      {pending ? "Marking…" : "Mark all read"}
    </Button>
  )
}
