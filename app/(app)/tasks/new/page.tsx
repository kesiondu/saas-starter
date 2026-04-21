import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NewTaskForm } from "@/components/tasks/new-task-form"
import { requireUser } from "@/lib/auth/session"
import { getUserAvailableCredits } from "@/lib/db/queries/credits"
import { getActiveVideoModels } from "@/config/video-models"

export const metadata = { title: "New task · AI Video Editor" }

export default async function NewTaskPage() {
  const user = await requireUser()
  const [credits, models] = await Promise.all([
    getUserAvailableCredits(user.id),
    Promise.resolve(getActiveVideoModels()),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5">
          <Link href="/tasks">
            <ArrowLeft className="size-4" />
            Back to tasks
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New video task
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll process this in the background and notify you when it&apos;s ready.
        </p>
      </div>

      <NewTaskForm models={models} availableCredits={credits} />
    </div>
  )
}
