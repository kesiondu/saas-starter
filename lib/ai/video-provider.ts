import "server-only"
import { assertFalConfigured, fal } from "./fal-client"
import type { VideoModelConfig } from "@/config/video-models"

/**
 * 视频生成 Provider 抽象
 * ----------------------------------------------
 * 目前只实现 Fal，但保留接口便于未来接入 Replicate 等。
 */

export interface SubmitVideoTaskInput {
  model: VideoModelConfig
  prompt: string
  imageUrl?: string
  /** 我们系统的 task id，回调时用于定位记录 */
  taskId: number
  /** 完成后回调的完整 URL */
  webhookUrl: string
}

export interface SubmitVideoTaskResult {
  /** Provider 侧的 request id，用于后续查询或撤销 */
  providerRequestId: string
}

export interface VideoTaskResult {
  /** 最终视频 URL */
  videoUrl: string
}

/**
 * 把 Fal webhook payload 解析为统一的 Result / Error
 */
export function parseFalWebhookPayload(
  payload: unknown,
): { status: "completed"; result: VideoTaskResult } | { status: "failed"; error: string } {
  const p = payload as Record<string, unknown>
  const status = String(p?.status ?? "").toUpperCase()

  if (status === "OK" || status === "COMPLETED") {
    const payloadBody = (p.payload ?? p.result) as Record<string, unknown> | undefined
    const video = payloadBody?.video as { url?: string } | undefined
    const videoUrl =
      video?.url ?? (payloadBody?.video_url as string | undefined) ?? (p.video_url as string | undefined)
    if (!videoUrl) {
      return { status: "failed", error: "Provider returned no video url" }
    }
    return { status: "completed", result: { videoUrl } }
  }

  const errorMsg =
    (p.error as string | undefined) ??
    ((p.payload as { detail?: string })?.detail) ??
    "Provider reported failure"
  return { status: "failed", error: errorMsg }
}

/**
 * 提交视频任务到 Fal 队列，注册 webhook 以便异步回调
 */
export async function submitVideoTask(
  input: SubmitVideoTaskInput,
): Promise<SubmitVideoTaskResult> {
  assertFalConfigured()

  const body: Record<string, unknown> = {
    prompt: input.prompt,
  }
  if (input.imageUrl && input.model.inputs.includes("image")) {
    body.image_url = input.imageUrl
  }

  const { request_id } = await fal.queue.submit(input.model.falEndpoint, {
    input: body,
    webhookUrl: input.webhookUrl,
  })

  return { providerRequestId: request_id }
}
