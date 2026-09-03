import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Boo B — Gameplay",
  description: "A playable platform game proof of concept with Boo B, Boo A and The Big One.",
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
    <html lang="pt">
      <body className="antialiased">{children}</body>
    </html>
  );
}
