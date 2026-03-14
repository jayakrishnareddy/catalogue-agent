import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { Gem } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata = {
  title: "Catalogue Agent",
  description: "AI-powered jewellery catalogue",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "Catalogue Agent",
    description: "AI-powered jewellery catalogue",
    url: "/",
    siteName: "Catalogue Agent",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catalogue Agent",
    description: "AI-powered jewellery catalogue",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Top nav */}
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
            >
              <Gem className="h-4 w-4 text-primary" strokeWidth={2.5} />
              Catalogue Agent
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
