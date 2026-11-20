import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || process.env.NEXT_PUBLIC_NEON_AUTH_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 300,
  },
});

export type DooraUser = { id: string; email: string; name?: string | null };

export async function getCurrentUser(): Promise<DooraUser | null> {
  const { data: session, error } = await auth.getSession();
  if (error) {
    console.error("[auth] Session lookup failed:", error.message);
    return null;
  }
  const user = session?.user;
  if (!user?.id || !user?.email) return null;
  return {
    id: String(user.id),
    email: String(user.email),
    name: user.name ?? null,
  };
}
