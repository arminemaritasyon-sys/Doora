import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOORA — Sen iste. Birisi halleder.",
  description: "Günlük işlerini kolayca paylaş. Yakınındaki insanlarla birlikte çöz.",
  applicationName: "DOORA",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DOORA" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbfcf9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
