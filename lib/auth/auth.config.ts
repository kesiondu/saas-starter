import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

/**
 * Edge-safe NextAuth 配置（不含任何 DB 调用）
 * ---------------------------------------------------------
 * 此文件会被 middleware 导入，必须保持在 Edge Runtime 可运行。
 * 完整配置（含 DB 同步）在 auth.ts 中基于此扩展。
 */
export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * middleware 调用此回调判断是否放行。
     * 未登录访问 /app 或 /billing 时重定向到 /login。
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const protectedRoutes = [
        "/dashboard",
        "/billing",
        "/settings",
        "/tasks",
        "/notifications",
      ]
      const isProtected = protectedRoutes.some((p) => pathname.startsWith(p))

      if (isProtected && !isLoggedIn) return false
      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
    /**
     * 把 DB user id 注入 JWT。
     * 首次登录时 signIn 回调在 auth.ts 中执行后，会在 user.dbId 上写入内部 ID。
     */
    async jwt({ token, user }) {
      if (user) {
        // @ts-expect-error dbId 由 signIn 回调注入
        const dbId = user.dbId as number | undefined
        if (dbId) token.uid = dbId
      }
      return token
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as number
      }
      return session
    },
  },
} satisfies NextAuthConfig
