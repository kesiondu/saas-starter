import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: number
    } & DefaultSession["user"]
  }
  interface User {
    dbId?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: number
  }
}
