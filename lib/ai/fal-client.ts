import "server-only"
import { fal } from "@fal-ai/client"

/**
 * Fal AI 客户端单例
 * ----------------------------------------------
 * 依赖环境变量：
 *   - FAL_KEY            Fal API key（服务端使用）
 *   - FAL_WEBHOOK_SECRET Fal webhook 签名校验密钥
 */
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY })
}

export { fal }

export function assertFalConfigured() {
  if (!process.env.FAL_KEY) {
    throw new Error("FAL_KEY is not configured. Add it to your environment variables.")
  }
}
