import "server-only"
import { and, eq, gt, sql } from "drizzle-orm"
import { db } from "@/lib/db/drizzle"
import { creditRecords, CreditSourceType, type CreditRecord } from "@/lib/db/schema"

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
