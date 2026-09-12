import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "../components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BigMotors LLC",
    template: "%s | BigMotors LLC",
  },
  description: "BigMotors LLC: автомашин, сэлбэг хэрэгсэл, дугуйн каталог.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mn">
      <body className="bg-zinc-100 font-sans text-zinc-950 antialiased tracking-normal">
        <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col bg-white">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:p-4 focus:text-emerald-800"
          >
            Үндсэн агуулга руу очих
          </a>
          <SiteHeader />
          <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t border-zinc-200 px-4 py-5 text-sm text-zinc-600 sm:px-6 lg:px-8">
            BigMotors LLC
          </footer>
        </div>
      </body>
    </html>
  );
}
