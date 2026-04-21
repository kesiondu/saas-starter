"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signInWithProvider } from "@/app/(auth)/actions"
import { GoogleIcon, GitHubIcon } from "./provider-icons"

type Provider = "google" | "github"

interface OAuthButtonsProps {
  callbackUrl?: string
}

export function OAuthButtons({ callbackUrl = "/dashboard" }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<Provider | null>(null)
  const [, startTransition] = useTransition()

  const handleClick = (provider: Provider) => {
    setLoading(provider)
    startTransition(async () => {
      try {
        await signInWithProvider(provider, callbackUrl)
      } catch {
        setLoading(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="relative h-11 w-full justify-center gap-3 font-medium"
        disabled={loading !== null}
        onClick={() => handleClick("google")}
      >
        {loading === "google" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <GoogleIcon className="size-5" />
        )}
        <span>Continue with Google</span>
      </Button>

      <Button
        type="button"
        size="lg"
        className="relative h-11 w-full justify-center gap-3 bg-foreground font-medium text-background hover:bg-foreground/90"
        disabled={loading !== null}
        onClick={() => handleClick("github")}
      >
        {loading === "github" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <GitHubIcon className="size-5" />
        )}
        <span>Continue with GitHub</span>
      </Button>
    </div>
  )
}
