import "server-only"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db/drizzle"
import { creditRecords, oauthAccounts, users } from "@/lib/db/schema"
import { NEW_USER_BONUS } from "@/config/app"

export interface UpsertOAuthUserInput {
  email: string
  name: string | null
  avatarUrl: string | null
  provider: string
  providerAccountId: string
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: Date | null
}

/**
 * OAuth 登录时同步用户 + 第三方账号。
 * 新用户自动发放注册奖励积分（NEW_USER_BONUS）。
 * 返回内部 users.id。
 */
export async function upsertOAuthUser(input: UpsertOAuthUserInput): Promise<{
  id: number
  isNewUser: boolean
}> {
  return await db.transaction(async (tx) => {
    // 1) 通过 provider + providerAccountId 精确查找已绑定账号
    const existingAccount = await tx.query.oauthAccounts.findFirst({
      where: and(
        eq(oauthAccounts.provider, input.provider),
        eq(oauthAccounts.providerAccountId, input.providerAccountId),
      ),
    })

    // 2) 查找/创建 user（以 email 作为主键身份）
    let userRow = await tx.query.users.findFirst({
      where: eq(users.email, input.email),
    })
    let isNewUser = false

    if (!userRow) {
      const [created] = await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          avatarUrl: input.avatarUrl,
          lastLoginAt: new Date(),
        })
        .returning()
      userRow = created
      isNewUser = true
    } else {
      await tx
        .update(users)
        .set({
          lastLoginAt: new Date(),
          ...(userRow.name ? {} : { name: input.name }),
          ...(userRow.avatarUrl ? {} : { avatarUrl: input.avatarUrl }),
        })
        .where(eq(users.id, userRow.id))
    }

    // 3) upsert oauth_accounts
    if (existingAccount) {
      await tx
        .update(oauthAccounts)
        .set({
          accessToken: input.accessToken ?? null,
          refreshToken: input.refreshToken ?? null,
          tokenExpiresAt: input.tokenExpiresAt ?? null,
        })
        .where(eq(oauthAccounts.id, existingAccount.id))
    } else {
      await tx.insert(oauthAccounts).values({
        userId: userRow.id,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        accessToken: input.accessToken ?? null,
        refreshToken: input.refreshToken ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
      })
    }

    // 4) 新用户赠送积分
    if (isNewUser && NEW_USER_BONUS.credits > 0) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + NEW_USER_BONUS.validityDays)
      await tx.insert(creditRecords).values({
        userId: userRow.id,
        creditsTotal: NEW_USER_BONUS.credits,
        creditsUsed: 0,
        sourceType: "bonus",
        sourceRef: "signup_bonus",
        expiresAt,
      })
    }

    return { id: userRow.id, isNewUser }
  })
}

export async function getUserById(id: number) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}
