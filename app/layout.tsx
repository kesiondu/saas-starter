import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"

export const metadata: Metadata = {
  title: "AI Video Editor",
  description: "AI-powered video editing for creators.",
}

export const viewport: Viewport = {
  maximumScale: 1,
}

const manrope = Manrope({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`bg-background text-foreground ${manrope.className}`}>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  )
}
