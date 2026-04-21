"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import {
  submitVideoEditTask,
  TaskServiceError,
} from "@/lib/tasks/service"

const submitSchema = z.object({
  modelCode: z.string().min(1),
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
})

export type SubmitTaskState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function submitVideoTaskAction(
  _prev: SubmitTaskState,
  formData: FormData,
): Promise<SubmitTaskState> {
  const user = await requireUser()
  const parsed = submitSchema.safeParse({
    modelCode: formData.get("modelCode"),
    prompt: formData.get("prompt"),
    imageUrl: formData.get("imageUrl") || undefined,
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors }
  }

  let createdId: number | null = null
  try {
    const task = await submitVideoEditTask({
      userId: user.id,
      userName: user.name,
      modelCode: parsed.data.modelCode,
      prompt: parsed.data.prompt,
      imageUrl: parsed.data.imageUrl,
    })
    createdId = task.id
  } catch (err) {
    if (err instanceof TaskServiceError) {
      return { error: err.message }
    }
    return { error: "Failed to submit task. Please try again." }
  }

  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  redirect(`/tasks/${createdId}`)
}
