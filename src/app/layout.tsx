import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { ScrollReveal } from "@/components/scroll-reveal";
import "./globals.css";

export const metadata: Metadata = {
  title: "GatherUp",
  description: "小型线下活动的一站式组织工具"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ScrollReveal />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
