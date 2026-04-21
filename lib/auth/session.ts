import "server-only"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import { getUserById } from "@/lib/db/queries/users"
import type { User } from "@/lib/db/schema"

/** 获取当前登录用户（未登录返回 null） */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await getUserById(session.user.id)
  return user ?? null
}

/** 要求登录，未登录跳转 /login */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}
