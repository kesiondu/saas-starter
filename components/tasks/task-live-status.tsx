"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { TaskStatusBadge } from "./task-status-badge"
import { TaskStatus } from "@/lib/db/schema"

interface Props {
  taskId: number
  initialStatus: string
}

interface PollResult {
  status: string
  outputUrl: string | null
  errorMessage: string | null
}

const POLL_INTERVAL_MS = 4000

export function TaskLiveStatus({ taskId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const router = useRouter()
  const isTerminal =
    status === TaskStatus.COMPLETED ||
    status === TaskStatus.FAILED ||
    status === TaskStatus.CANCELED

  useEffect(() => {
    if (isTerminal) return
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as PollResult
        if (cancelled) return
        if (data.status !== status) {
          setStatus(data.status)
          router.refresh()
        }
      } catch {
        // ignore transient errors
      }
    }

    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [taskId, status, isTerminal, router])

  return (
    <div className="flex items-center gap-2">
      <TaskStatusBadge status={status} />
      {!isTerminal ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          Checking for updates…
        </span>
      ) : null}
    </div>
  )
}
