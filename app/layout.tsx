import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Cron Job Generator",
  description: "Generate cron job expressions easily",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
