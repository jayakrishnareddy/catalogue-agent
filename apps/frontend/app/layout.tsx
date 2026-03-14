import "./globals.css";
import type { ReactNode } from "react";
export const metadata = { title: "Catalogue Agent", description: "AI-powered catalogue for small shops" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
