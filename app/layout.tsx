import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEAP AI — Livelihood Enablement through AI Pathways",
  description: "A voice-first livelihood decision-support prototype for PM-AJAY beneficiaries.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
