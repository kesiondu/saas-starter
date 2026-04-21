import Link from "next/link"
import { ArrowRight, Film, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TaskStatusBadge } from "@/components/tasks/task-status-badge"
import { requireUser } from "@/lib/auth/session"
import { listUserTasks } from "@/lib/db/queries/tasks"
import { getVideoModel } from "@/config/video-models"

export const metadata = { title: "Tasks · AI Video Editor" }

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

export default async function TasksPage() {
  const user = await requireUser()
  const tasks = await listUserTasks(user.id, { limit: 30 })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI video editing history.
          </p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="size-4" />
            New task
          </Link>
        </Button>
      </header>

      {tasks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="size-4" aria-hidden="true" />
              No tasks yet
            </CardTitle>
            <CardDescription>
              Submit your first AI video edit to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tasks/new">
                Create first task
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {tasks.map((task) => {
            const params = task.inputParams as {
              modelCode?: string
              prompt?: string
            }
            const model = params.modelCode
              ? getVideoModel(params.modelCode)
              : undefined
            return (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{model?.name ?? "Unknown model"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{dateFormatter.format(task.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-foreground">
                      {params.prompt ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <TaskStatusBadge status={task.status} />
                    <span>{task.creditsCost} credits</span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
