"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth/session"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/queries/notifications"

export async function markNotificationReadAction(id: number) {
  const user = await requireUser()
  await markNotificationRead(user.id, id)
  revalidatePath("/notifications")
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser()
  await markAllNotificationsRead(user.id)
  revalidatePath("/notifications")
}
