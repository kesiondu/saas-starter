import "server-only"
import { db } from "@/lib/db/drizzle"
import { tasks, TaskStatus, TaskType } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getVideoModel } from "@/config/video-models"
import { TASK_QUEUE } from "@/config/app"
import {
  consumeCreditsForTask,
  InsufficientCreditsError,
  refundCreditsForTask,
  getUserAvailableCredits,
} from "@/lib/db/queries/credits"
import {
  countUserActiveTasks,
  updateTaskStatus,
} from "@/lib/db/queries/tasks"
import { submitVideoTask } from "@/lib/ai/video-provider"
import { notifyTaskFailed } from "@/lib/notifications/dispatcher"

function getWebhookUrl(taskId: number): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  return `${base}/api/fal/webhook?taskId=${taskId}`
}

export class TaskServiceError extends Error {
  code: "INSUFFICIENT_CREDITS" | "MAX_CONCURRENT" | "INVALID_MODEL" | "PROVIDER_FAILED"
  constructor(code: TaskServiceError["code"], message: string) {
    super(message)
    this.code = code
  }
}

interface SubmitInput {
  userId: number
  userName?: string | null
  modelCode: string
  prompt: string
  imageUrl?: string
}

/**
 * 提交 AI 视频任务的完整流程：
 * 1) 校验模型、并发限制、可用积分
 * 2) 原子地扣积分 + 创建 task（pending）
 * 3) 调用 Fal 提交任务，保存 provider_request_id
 * 4) 失败时退回积分 + 标记 failed
 */
export async function submitVideoEditTask(input: SubmitInput) {
  const model = getVideoModel(input.modelCode)
  if (!model) throw new TaskServiceError("INVALID_MODEL", "Unknown or inactive model")

  const active = await countUserActiveTasks(input.userId)
  if (active >= TASK_QUEUE.maxConcurrentPerUser) {
    throw new TaskServiceError(
      "MAX_CONCURRENT",
      `You can run up to ${TASK_QUEUE.maxConcurrentPerUser} tasks at the same time.`,
    )
  }

  const balance = await getUserAvailableCredits(input.userId)
  if (balance < model.creditsCost) {
    throw new TaskServiceError("INSUFFICIENT_CREDITS", "Not enough credits.")
  }

  // 创建 task 行（processing）
  const [row] = await db
    .insert(tasks)
    .values({
      userId: input.userId,
      taskType: TaskType.VIDEO_EDIT,
      status: TaskStatus.PROCESSING,
      creditsCost: model.creditsCost,
      inputParams: {
        modelCode: model.code,
        prompt: input.prompt,
        imageUrl: input.imageUrl,
      },
      startedAt: new Date(),
    })
    .returning()

  // 扣积分
  try {
    await consumeCreditsForTask({
      userId: input.userId,
      amount: model.creditsCost,
      taskId: row.id,
    })
  } catch (err) {
    await db
      .update(tasks)
      .set({
        status: TaskStatus.FAILED,
        errorMessage:
          err instanceof InsufficientCreditsError
            ? "Insufficient credits"
            : "Failed to reserve credits",
        completedAt: new Date(),
      })
      .where(eq(tasks.id, row.id))
    if (err instanceof InsufficientCreditsError) {
      throw new TaskServiceError("INSUFFICIENT_CREDITS", "Not enough credits.")
    }
    throw err
  }

  // 提交给 Fal
  try {
    const { providerRequestId } = await submitVideoTask({
      model,
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      taskId: row.id,
      webhookUrl: getWebhookUrl(row.id),
    })
    await updateTaskStatus(row.id, { providerRequestId })
  } catch (err) {
    // Provider 调用失败：退款 + 标记 failed + 通知
    await refundCreditsForTask({ userId: input.userId, taskId: row.id })
    await updateTaskStatus(row.id, {
      status: TaskStatus.FAILED,
      errorMessage: (err as Error).message ?? "Provider submission failed",
      completedAt: new Date(),
    })
    await notifyTaskFailed({
      userId: input.userId,
      userName: input.userName,
      taskId: row.id,
      errorMessage: (err as Error).message,
    })
    throw new TaskServiceError("PROVIDER_FAILED", (err as Error).message)
  }

  return row
}
