import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Macro News",
  description: "Macro News frontend",
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

