import "server-only"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db/drizzle"
import {
  subscriptionPlans,
  userSubscriptions,
  type SubscriptionPlan,
  type UserSubscription,
} from "@/lib/db/schema"

/** 按 planCode 查找计划（若不存在则按 stripe_price_id 兜底） */
export async function findPlanByCode(
  planCode: string,
): Promise<SubscriptionPlan | undefined> {
  return db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.planCode, planCode),
  })
}

export async function findPlanByStripePriceId(
  stripePriceId: string,
): Promise<SubscriptionPlan | undefined> {
  return db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.stripePriceId, stripePriceId),
  })
}

/** 查询用户当前有效订阅（active / trialing / past_due 视为当前） */
export async function getActiveUserSubscription(
  userId: number,
): Promise<
  (UserSubscription & { plan: SubscriptionPlan | null }) | null
> {
  const row = await db.query.userSubscriptions.findFirst({
    where: and(
      eq(userSubscriptions.userId, userId),
      inArray(userSubscriptions.status, ["active", "trialing", "past_due"]),
    ),
    orderBy: [desc(userSubscriptions.createdAt)],
    with: { plan: true },
  })
  return row ?? null
}

/** 依据 stripeSubscriptionId 查找 */
export async function findSubscriptionByStripeId(stripeSubscriptionId: string) {
  return db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId),
  })
}

interface UpsertSubscriptionInput {
  userId: number
  planId: number
  stripeSubscriptionId: string
  status: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  canceledAt?: Date | null
}

/** 按 stripe_subscription_id upsert */
export async function upsertUserSubscription(input: UpsertSubscriptionInput) {
  const existing = await findSubscriptionByStripeId(input.stripeSubscriptionId)
  if (existing) {
    const [row] = await db
      .update(userSubscriptions)
      .set({
        planId: input.planId,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        canceledAt: input.canceledAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, existing.id))
      .returning()
    return { row, isNew: false as const }
  }
  const [row] = await db
    .insert(userSubscriptions)
    .values({
      userId: input.userId,
      planId: input.planId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      canceledAt: input.canceledAt ?? null,
    })
    .returning()
  return { row, isNew: true as const }
}

/** 标记订阅状态 */
export async function setSubscriptionStatus(
  stripeSubscriptionId: string,
  patch: Partial<{
    status: string
    cancelAtPeriodEnd: boolean
    canceledAt: Date | null
    currentPeriodEnd: Date
  }>,
) {
  await db
    .update(userSubscriptions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
}
