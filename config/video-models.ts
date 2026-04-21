/**
 * AI 视频模型配置
 * ----------------------------------------------
 * 每种模型绑定一个固定积分消耗，提交任务时按模型 code 查 cost。
 * 新增模型只需在此追加，业务代码零改动。
 */

export interface VideoModelConfig {
  /** 前端/DB 用的唯一 code */
  code: string
  /** 展示名称 */
  name: string
  /** 简短描述 */
  description: string
  /** Fal 模型 endpoint，如 "fal-ai/runway-gen3/turbo/image-to-video" */
  falEndpoint: string
  /** 单次任务消耗积分 */
  creditsCost: number
  /** 预估时长（秒）- 仅用于 UI 展示 */
  estimatedSeconds: number
  /** 支持的输入类型 */
  inputs: ("prompt" | "image" | "video")[]
  /** 是否上架 */
  isActive: boolean
}

export const VIDEO_MODELS: VideoModelConfig[] = [
  {
    code: "runway_gen3_turbo",
    name: "Runway Gen-3 Turbo",
    description: "Fast image-to-video with natural motion",
    falEndpoint: "fal-ai/runway-gen3/turbo/image-to-video",
    creditsCost: 10,
    estimatedSeconds: 60,
    inputs: ["prompt", "image"],
    isActive: true,
  },
  {
    code: "kling_video",
    name: "Kling 1.5",
    description: "Cinematic video from text or image",
    falEndpoint: "fal-ai/kling-video/v1.5/standard/text-to-video",
    creditsCost: 15,
    estimatedSeconds: 120,
    inputs: ["prompt"],
    isActive: true,
  },
  {
    code: "luma_dream",
    name: "Luma Dream Machine",
    description: "High fidelity, longer duration",
    falEndpoint: "fal-ai/luma-dream-machine",
    creditsCost: 20,
    estimatedSeconds: 90,
    inputs: ["prompt", "image"],
    isActive: true,
  },
]

export function getVideoModel(code: string): VideoModelConfig | undefined {
  return VIDEO_MODELS.find((m) => m.code === code && m.isActive)
}

export function getActiveVideoModels(): VideoModelConfig[] {
  return VIDEO_MODELS.filter((m) => m.isActive)
}
