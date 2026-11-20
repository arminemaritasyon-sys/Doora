import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon Auth server instance.
// These variables must be configured in both the Cloudflare build and runtime
// environments because this module is also imported by route handlers/proxy.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 300,
  },
});

export type DooraUser = {
  id: string;
  email: string;
  name?: string | null;
};

export async function getCurrentUser(): Promise<DooraUser | null> {
  try {
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
  } catch (error) {
    console.error("[auth] Unable to read session:", error);
    return null;
  }
}
