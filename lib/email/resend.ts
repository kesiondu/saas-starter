import "server-only"
import { Resend } from "resend"

let cached: Resend | null = null

/**
 * 延迟初始化 Resend 客户端。
 * 预留 key：未配置时返回 null，调用方应当降级（仅站内通知）。
 */
export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY)
  return cached
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "AI Video Studio <notifications@example.com>"
