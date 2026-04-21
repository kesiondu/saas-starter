import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/drizzle"
import { users, tasks, TaskStatus } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  getTaskById,
  getTaskByProviderRequestId,
  updateTaskStatus,
} from "@/lib/db/queries/tasks"
import { refundCreditsForTask } from "@/lib/db/queries/credits"
import {
  notifyTaskCompleted,
  notifyTaskFailed,
} from "@/lib/notifications/dispatcher"
import { parseFalWebhookPayload } from "@/lib/ai/video-provider"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Fal webhook 回调
 * ----------------------------------------------
 * 通过 taskId query 或 payload.request_id 定位任务，更新状态并触发通知。
 *
 * 安全性：Fal webhook 本身不带签名头，为防伪造：
 *   1. URL 中附带我们自己的 taskId（由 submitVideoTask 注入）
 *   2. 校验 header 中的 x-webhook-secret（若配置了 FAL_WEBHOOK_SECRET）
 */
export async function POST(req: NextRequest) {
  // 可选共享密钥校验
  const sharedSecret = process.env.FAL_WEBHOOK_SECRET
  if (sharedSecret) {
    const provided = req.headers.get("x-webhook-secret")
    if (provided !== sharedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const url = new URL(req.url)
  const taskIdParam = url.searchParams.get("taskId")
  const payload = await req.json().catch(() => ({}))

  // 定位任务：优先用 URL 上的 taskId，其次用 provider request_id
  let task = taskIdParam
    ? await getTaskById(Number.parseInt(taskIdParam, 10))
    : undefined
  if (!task && typeof payload?.request_id === "string") {
    task = await getTaskByProviderRequestId(payload.request_id)
  }

  if (!task) {
    console.log("[v0] Webhook: task not found", { taskIdParam, requestId: payload?.request_id })
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // 幂等：已终态直接忽略
  if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED) {
    return NextResponse.json({ ok: true, alreadyFinal: true })
  }

  const parsed = parseFalWebhookPayload(payload)
  const owner = await db.query.users.findFirst({ where: eq(users.id, task.userId) })

  if (parsed.status === "completed") {
    await updateTaskStatus(task.id, {
      status: TaskStatus.COMPLETED,
      outputUrl: parsed.result.videoUrl,
      completedAt: new Date(),
    })
    await notifyTaskCompleted({
      userId: task.userId,
      userName: owner?.name,
      taskId: task.id,
    })
  } else {
    // 失败：退款 + 通知
    await refundCreditsForTask({ userId: task.userId, taskId: task.id })
    await db
      .update(tasks)
      .set({
        status: TaskStatus.FAILED,
        errorMessage: parsed.error,
        completedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
    await notifyTaskFailed({
      userId: task.userId,
      userName: owner?.name,
      taskId: task.id,
      errorMessage: parsed.error,
    })
  }

  return NextResponse.json({ ok: true })
}
