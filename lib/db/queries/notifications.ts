import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db/drizzle"
import {
  notifications,
  type NewNotification,
  type Notification,
} from "@/lib/db/schema"

export async function createNotification(input: NewNotification): Promise<Notification> {
  const [row] = await db.insert(notifications).values(input).returning()
  return row
}

export async function listUserNotifications(
  userId: number,
  options: { limit?: number; unreadOnly?: boolean } = {},
) {
  const limit = Math.min(options.limit ?? 20, 50)
  const filters = [eq(notifications.userId, userId)]
  if (options.unreadOnly) filters.push(eq(notifications.isRead, false))
  return db
    .select()
    .from(notifications)
    .where(and(...filters))
    .orderBy(desc(notifications.id))
    .limit(limit)
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
    )
  return Number(rows[0]?.n ?? 0)
}

export async function markNotificationRead(userId: number, id: number) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
}

export async function markAllNotificationsRead(userId: number) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
}

export async function markNotificationEmailSent(id: number) {
  await db.update(notifications).set({ isEmailSent: true }).where(eq(notifications.id, id))
}
