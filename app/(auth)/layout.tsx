import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">{children}</div>
    </main>
  )
}
