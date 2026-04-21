import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TaskLiveStatus } from "@/components/tasks/task-live-status"
import { requireUser } from "@/lib/auth/session"
import { getTaskById } from "@/lib/db/queries/tasks"
import { getVideoModel } from "@/config/video-models"
import { TaskStatus } from "@/lib/db/schema"

export const metadata = { title: "Task · AI Video Editor" }

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
})

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const taskId = Number.parseInt(id, 10)
  if (!Number.isFinite(taskId)) notFound()

  const user = await requireUser()
  const task = await getTaskById(taskId, user.id)
  if (!task) notFound()

  const input = task.inputParams as {
    modelCode?: string
    prompt?: string
    imageUrl?: string
  }
  const model = input.modelCode ? getVideoModel(input.modelCode) : undefined

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5">
          <Link href="/tasks">
            <ArrowLeft className="size-4" />
            Back to tasks
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {model?.name ?? "Video task"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {dateFormatter.format(task.createdAt)} ·{" "}
              {task.creditsCost} credits
            </p>
          </div>
          <TaskLiveStatus taskId={task.id} initialStatus={task.status} />
        </div>
      </div>

      {task.status === TaskStatus.COMPLETED && task.outputUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-hidden rounded-md border border-border bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={task.outputUrl}
                controls
                className="aspect-video w-full"
              />
            </div>
            <Button asChild variant="outline" size="sm">
              <a href={task.outputUrl} download target="_blank" rel="noreferrer">
                <Download className="size-4" />
                Download
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {task.status === TaskStatus.FAILED ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Task failed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {task.errorMessage ?? "Unknown error."}
            </p>
            <p className="text-xs text-muted-foreground">
              Credits were automatically refunded.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Prompt
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-foreground">
              {input.prompt ?? "—"}
            </dd>
          </div>
          {input.imageUrl ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Reference image
              </dt>
              <dd className="mt-1 break-all text-foreground">
                <a
                  href={input.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {input.imageUrl}
                </a>
              </dd>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
