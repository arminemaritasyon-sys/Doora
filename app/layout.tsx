import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOORA — Sen iste. Birisi halleder.",
  description: "Günlük küçük işleri güvenilir insanlarla kolayca tamamla.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
