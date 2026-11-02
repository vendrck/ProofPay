import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/illustrations";
import { THEME_SCRIPT, ThemeToggle } from "@/components/theme";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ProofPay",
  description: "Escrow for freelance work: AI verifies the delivery, PayPal holds and releases the money.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before React hydrates.
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <body>
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <header className="topbar">
          <nav className="topbar-inner">
            <Link href="/" className="brand">
              <BrandMark />
              ProofPay
            </Link>
            <Link href="/jobs">Activity</Link>
            <Link href="/jobs/new">New job</Link>
            {/* No prefetch: /admin redirects when logged out, and React's dev profiler crashes on that rejected prefetch. */}
            <Link href="/admin" className="topbar-end" prefetch={false}>
              Admin
            </Link>
            <ThemeToggle />
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div className="footer-inner">
            <span>ProofPay · built on the PayPal Orders, Payments, Payouts and Disputes APIs (sandbox)</span>
            <span>AI drafts. People approve. PayPal moves the money.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
