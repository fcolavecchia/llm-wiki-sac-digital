import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";
import { Sidebar } from "../components/sidebar";
import { getAllPages } from "../lib/content";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_SITE_NAME || "Wiki Sac Digital",
    template: `%s | ${process.env.NEXT_PUBLIC_SITE_NAME || "Wiki Sac Digital"}`,
  },
  description: "Wiki persistente basado en archivos y mantenido por un LLM.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pages = await getAllPages();

  return (
    <html lang="es">
      <body className={`${display.variable} ${sans.variable}`} style={{ fontFamily: "var(--font-sans)" }}>
        <div className="app-shell">
          <Sidebar pages={pages} />
          <main className="content-shell">{children}</main>
        </div>
      </body>
    </html>
  );
}
