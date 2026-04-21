import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { getTaskById } from "@/lib/db/queries/tasks"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const taskId = Number.parseInt(id, 10)
  if (!Number.isFinite(taskId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const task = await getTaskById(taskId, user.id)
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: task.id,
    status: task.status,
    outputUrl: task.outputUrl,
    errorMessage: task.errorMessage,
    createdAt: task.createdAt,
    completedAt: task.completedAt,
  })
}
