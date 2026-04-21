import "server-only"
import { and, asc, eq, gt, sql } from "drizzle-orm"
import { db } from "@/lib/db/drizzle"
import {
  creditRecords,
  creditTransactions,
  CreditSourceType,
  type CreditRecord,
} from "@/lib/db/schema"

/**
 * 查询用户当前可用积分（剔除过期与用完部分）
 */
export async function getUserAvailableCredits(userId: number): Promise<number> {
  const rows = await db
    .select({
      remaining: sql<number>`COALESCE(SUM(${creditRecords.creditsTotal} - ${creditRecords.creditsUsed}), 0)`,
    })
    .from(creditRecords)
    .where(
      and(
        eq(creditRecords.userId, userId),
        gt(creditRecords.expiresAt, new Date()),
        sql`${creditRecords.creditsTotal} > ${creditRecords.creditsUsed}`,
      ),
    )

  return Number(rows[0]?.remaining ?? 0)
}

interface GrantCreditsInput {
  userId: number
  credits: number
  validityDays: number
  sourceType: CreditSourceType
  sourceRef?: string
}

/**
 * 为用户发放一条积分记录（带过期时间）
 * ----------------------------------------------
 * 用于：订阅续费、积分包购买、新用户奖励等
 *
 * 幂等性：若提供了 sourceRef，则在 (user_id, source_type, source_ref) 冲突时
 * 视为重复事件，返回已存在的记录；否则插入新记录。
 * 依赖 scripts/002-credit-grants-idempotency.sql 中的唯一索引。
 */
export async function grantCredits(
  input: GrantCreditsInput,
): Promise<{ record: CreditRecord; isNew: boolean }> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + input.validityDays)

  // 有 sourceRef 时使用原子 INSERT...ON CONFLICT DO NOTHING
  if (input.sourceRef) {
    const inserted = await db
      .insert(creditRecords)
      .values({
        userId: input.userId,
        creditsTotal: input.credits,
        creditsUsed: 0,
        sourceType: input.sourceType,
        sourceRef: input.sourceRef,
        expiresAt,
      })
      .onConflictDoNothing({
        target: [
          creditRecords.userId,
          creditRecords.sourceType,
          creditRecords.sourceRef,
        ],
      })
      .returning()

    if (inserted.length > 0) {
      return { record: inserted[0], isNew: true }
    }
    // 冲突：查询已存在的记录返回
    const existing = await db.query.creditRecords.findFirst({
      where: and(
        eq(creditRecords.userId, input.userId),
        eq(creditRecords.sourceType, input.sourceType),
        eq(creditRecords.sourceRef, input.sourceRef),
      ),
    })
    return { record: existing!, isNew: false }
  }

  // 无 sourceRef（如匿名 bonus），直接插入
  const [row] = await db
    .insert(creditRecords)
    .values({
      userId: input.userId,
      creditsTotal: input.credits,
      creditsUsed: 0,
      sourceType: input.sourceType,
      sourceRef: null,
      expiresAt,
    })
    .returning()

  return { record: row, isNew: true }
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient credits")
    this.name = "InsufficientCreditsError"
  }
}

/**
 * 消耗积分（先过期先扣）
 * ----------------------------------------------
 * 遍历未过期、未用完的积分记录，按 expires_at 升序逐条扣减，
 * 并为每次扣减写入一条 credit_transactions 记录（amount 为负）。
 *
 * 在一个事务内执行，失败抛 InsufficientCreditsError。
 */
export async function consumeCreditsForTask(params: {
  userId: number
  amount: number
  taskId: number
  reason?: string
}): Promise<void> {
  if (params.amount <= 0) return

  await db.transaction(async (tx) => {
    const records = await tx
      .select()
      .from(creditRecords)
      .where(
        and(
          eq(creditRecords.userId, params.userId),
          gt(creditRecords.expiresAt, new Date()),
          sql`${creditRecords.creditsTotal} > ${creditRecords.creditsUsed}`,
        ),
      )
      .orderBy(asc(creditRecords.expiresAt))
      .for("update")

    let remaining = params.amount
    const deductions: Array<{ recordId: number; amount: number }> = []
    for (const rec of records) {
      if (remaining <= 0) break
      const available = rec.creditsTotal - rec.creditsUsed
      const take = Math.min(available, remaining)
      deductions.push({ recordId: rec.id, amount: take })
      remaining -= take
    }

    if (remaining > 0) {
      throw new InsufficientCreditsError()
    }

    for (const d of deductions) {
      await tx
        .update(creditRecords)
        .set({ creditsUsed: sql`${creditRecords.creditsUsed} + ${d.amount}` })
        .where(eq(creditRecords.id, d.recordId))

      await tx.insert(creditTransactions).values({
        userId: params.userId,
        creditRecordId: d.recordId,
        taskId: params.taskId,
        amount: -d.amount,
        reason: params.reason ?? "task_consume",
      })
    }
  })
}

/**
 * 退款积分
 * ----------------------------------------------
 * 根据任务关联的消费流水反向扣回 credits_used，并写入退款流水。
 * 幂等：若该任务已存在 refund 记录，则跳过。
 */
export async function refundCreditsForTask(params: {
  userId: number
  taskId: number
  reason?: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    // 幂等检查
    const alreadyRefunded = await tx
      .select({ id: creditTransactions.id })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.taskId, params.taskId),
          eq(creditTransactions.reason, "refund"),
        ),
      )
      .limit(1)
    if (alreadyRefunded.length > 0) return

    const consumes = await tx
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.taskId, params.taskId),
          eq(creditTransactions.reason, "task_consume"),
        ),
      )

    for (const c of consumes) {
      const refundAmount = -c.amount // c.amount 是负数，取反为正
      if (refundAmount <= 0) continue

      await tx
        .update(creditRecords)
        .set({
          creditsUsed: sql`GREATEST(${creditRecords.creditsUsed} - ${refundAmount}, 0)`,
        })
        .where(eq(creditRecords.id, c.creditRecordId))

      await tx.insert(creditTransactions).values({
        userId: params.userId,
        creditRecordId: c.creditRecordId,
        taskId: params.taskId,
        amount: refundAmount,
        reason: params.reason ?? "refund",
      })
    }
  })
}
