"use server"

import { signIn, signOut } from "@/lib/auth/auth"

export async function signInWithProvider(provider: "google" | "github", callbackUrl = "/dashboard") {
  await signIn(provider, { redirectTo: callbackUrl })
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" })
}
