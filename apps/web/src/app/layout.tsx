import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IP & MD Platform",
  description: "Intelligent Prescription & Medicine Discovery Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
