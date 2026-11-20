import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tanımlı değil. Vercel Neon entegrasyonunu kontrol edin.");
}

export const db = neon(process.env.DATABASE_URL);
