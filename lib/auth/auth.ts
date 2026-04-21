import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { upsertOAuthUser } from "@/lib/db/queries/users"

/**
 * 完整 NextAuth（含 DB 同步）
 * ---------------------------------------------------------
 * 仅在 Node runtime 使用。middleware 请用 auth.config.ts。
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (!account || !user.email) {
        console.error("[auth] signIn missing account/email")
        return false
      }

      try {
        const { id } = await upsertOAuthUser({
          email: user.email,
          name: user.name ?? (profile?.name as string | undefined) ?? null,
          avatarUrl: user.image ?? null,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          accessToken: account.access_token ?? null,
          refreshToken: account.refresh_token ?? null,
          tokenExpiresAt: account.expires_at
            ? new Date(account.expires_at * 1000)
            : null,
        })

        // 注入内部 user id，供 jwt 回调取用
        // @ts-expect-error 扩展 User
        user.dbId = id
        return true
      } catch (error) {
        console.error("[auth] signIn error:", error)
        return false
      }
    },
  },
})
