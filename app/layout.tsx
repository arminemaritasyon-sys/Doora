import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOORA — Günlük işler, kolay çözümler",
  description: "İşini paylaş, yakınındaki insanlarla kolayca çöz.",
  applicationName: "DOORA",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DOORA" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}<Toaster position="top-center" richColors closeButton /></body>
    </html>
  );
}
