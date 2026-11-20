import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOORA — Sen iste. Birisi halleder.",
  description: "Günlük işlerini yakındaki insanlarla kolayca hallet. İşini paylaş, teklifleri değerlendir, birlikte tamamlayın.",
  applicationName: "DOORA",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DOORA" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f8f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}