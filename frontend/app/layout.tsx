import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Macro Tracker Dashboard",
  description:
    "Macro Tracker dashboard for monitoring macro theme heat and supporting evidence.",
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
