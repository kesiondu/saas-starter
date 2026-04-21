import Link from "next/link"
import { ArrowRight, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth/auth"

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Film className="size-4" aria-hidden="true" />
          </span>
          <span>AI Video Editor</span>
        </Link>
        <nav className="flex items-center gap-2">
          {session?.user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center md:px-10">
        <span className="mb-5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Now in beta · 50 free credits on sign-up
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Edit videos with AI, in minutes instead of hours.
        </h1>
        <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground text-pretty md:text-lg">
          Upload a clip, describe what you want, and let the studio do the
          tedious work. Keep the creative part for yourself.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href={session?.user ? "/dashboard" : "/login"}>
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
