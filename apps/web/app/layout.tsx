import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GVP | Global Video Platform",
  description: "Viewer and creator workspace for Global Video Platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
