import NextAuth from "next-auth"
import authConfig from "@/lib/auth/auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export default middleware((req) => {
  // authConfig.callbacks.authorized 已处理放行/拦截逻辑，此处无需额外操作
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
}
