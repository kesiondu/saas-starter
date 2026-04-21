import "server-only"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db/drizzle"
import { tasks, TaskStatus, type Task, type NewTask } from "@/lib/db/schema"

export async function createTask(input: NewTask): Promise<Task> {
  const [row] = await db.insert(tasks).values(input).returning()
  return row
}

export async function getTaskById(taskId: number, userId?: number) {
  const filters = [eq(tasks.id, taskId)]
  if (userId !== undefined) filters.push(eq(tasks.userId, userId))
  return db.query.tasks.findFirst({
    where: and(...filters),
  })
}

export async function getTaskByProviderRequestId(providerRequestId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.providerRequestId, providerRequestId),
  })
}

export async function listUserTasks(
  userId: number,
  options: { limit?: number; cursor?: number } = {},
) {
  const limit = Math.min(options.limit ?? 20, 50)
  const filters = [eq(tasks.userId, userId)]
  if (options.cursor !== undefined) {
    filters.push(sql`${tasks.id} < ${options.cursor}`)
  }
  return db
    .select()
    .from(tasks)
    .where(and(...filters))
    .orderBy(desc(tasks.id))
    .limit(limit)
}

export async function countUserActiveTasks(userId: number): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        sql`${tasks.status} IN (${TaskStatus.PENDING}, ${TaskStatus.PROCESSING})`,
      ),
    )
  return Number(rows[0]?.n ?? 0)
}

export async function updateTaskStatus(
  taskId: number,
  patch: Partial<Pick<Task, "status" | "outputUrl" | "errorMessage" | "providerRequestId" | "startedAt" | "completedAt">>,
) {
  await db.update(tasks).set(patch).where(eq(tasks.id, taskId))
}
