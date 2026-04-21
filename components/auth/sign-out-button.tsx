"use client"

import { useTransition } from "react"
import { Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/app/(auth)/actions"

interface Props {
  variant?: "ghost" | "outline" | "default"
  className?: string
}

export function SignOutButton({ variant = "ghost", className }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      <span>Sign out</span>
    </Button>
  )
}
