import "server-only"
import { db } from "@/lib/db/drizzle"
import { users, NotificationType, type NewNotification } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  createNotification,
  markNotificationEmailSent,
} from "@/lib/db/queries/notifications"
import { getResend, EMAIL_FROM } from "@/lib/email/resend"
import { taskCompletedEmail, taskFailedEmail } from "@/lib/email/templates"

interface DispatchInput {
  userId: number
  type: NotificationType | string
  title: string
  content?: string
  relatedTaskId?: number
  /** 若提供 email 将在创建站内通知后异步发送邮件 */
  email?: {
    subject: string
    html: string
  }
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  )
}

/**
 * 同时创建站内通知 + 发送邮件（若启用）
 * 邮件失败不影响站内通知。
 */
export async function dispatchNotification(input: DispatchInput) {
  const newNotif: NewNotification = {
    userId: input.userId,
    type: input.type,
    title: input.title,
    content: input.content ?? null,
    relatedTaskId: input.relatedTaskId ?? null,
  }
  const created = await createNotification(newNotif)

  if (!input.email) return created

  // 检查用户偏好 + Resend 是否配置
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
  })
  if (!user || !user.emailNotificationEnabled) return created

  const resend = getResend()
  if (!resend) {
    console.log("[v0] Resend not configured, skipping email for user", input.userId)
    return created
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: user.email,
      subject: input.email.subject,
      html: input.email.html,
    })
    await markNotificationEmailSent(created.id)
  } catch (err) {
    console.log("[v0] Failed to send email:", (err as Error).message)
  }

  return created
}

/* --------------------------------- 快捷方法 --------------------------------- */

export async function notifyTaskCompleted(args: {
  userId: number
  userName?: string | null
  taskId: number
}) {
  const taskUrl = `${getBaseUrl()}/tasks/${args.taskId}`
  const email = taskCompletedEmail({ name: args.userName, taskUrl })
  return dispatchNotification({
    userId: args.userId,
    type: NotificationType.TASK_COMPLETED,
    title: "Your video is ready",
    content: "Your AI video rendering has completed successfully.",
    relatedTaskId: args.taskId,
    email,
  })
}

export async function notifyTaskFailed(args: {
  userId: number
  userName?: string | null
  taskId: number
  errorMessage?: string | null
}) {
  const taskUrl = `${getBaseUrl()}/tasks/${args.taskId}`
  const email = taskFailedEmail({
    name: args.userName,
    taskUrl,
    errorMessage: args.errorMessage,
  })
  return dispatchNotification({
    userId: args.userId,
    type: NotificationType.TASK_FAILED,
    title: "Your video task failed",
    content: args.errorMessage ?? "The provider reported a failure.",
    relatedTaskId: args.taskId,
    email,
  })
}
