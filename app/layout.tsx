import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import { AppNav, NavView } from "@/components/nav/AppNav";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LookLab", template: "%s · LookLab" },
  description: "Discover it. Try it. Make it yours. See fashion on you with AI try-on.",
};

export const viewport: Viewport = { themeColor: "#FFF8F0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <Suspense fallback={<NavView pathname="" count={0} />}>
          <AppNav />
        </Suspense>
        <div className="flex flex-1 flex-col pb-20 md:pb-0">{children}</div>
        <footer className="mx-auto mb-24 mt-12 w-full max-w-6xl px-4 text-xs opacity-70 md:mb-8">
          LookLab is a hackathon demo. All items are demo catalogue pieces. Try-ons are AI-generated previews by
          Clothsy AI, not a guarantee of fit. <a href="/privacy" className="underline">Privacy &amp; AI info</a>
        </footer>
      </body>
    </html>
  );
}
