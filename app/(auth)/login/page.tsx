import Link from "next/link"
import { Film } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { OAuthButtons } from "@/components/auth/oauth-buttons"

export const metadata = {
  title: "Sign in · AI Video Editor",
}

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { callbackUrl, error } = await searchParams

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="flex flex-col items-center gap-4 pt-8 pb-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
          <Film className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
            Welcome back
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Sign in to start editing videos with AI. New here? We&apos;ll set you up
            automatically.
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 px-6 pb-8 pt-4">
        {error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            Sign-in failed. Please try again.
          </div>
        ) : null}

        <OAuthButtons callbackUrl={callbackUrl ?? "/dashboard"} />

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  )
}
