import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

// Neon Auth's endpoint is public configuration, not a credential.
// Keep a verified fallback so a missing Cloudflare runtime variable cannot
// turn the proxy target into "undefined/sign-in/...".
const authBaseUrl =
  process.env.NEON_AUTH_BASE_URL?.trim() ||
  "https://ep-rough-boat-bcrte998.neonauth.c-16.us-east-1.aws.neon.tech/neondb/auth";

const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

if (!cookieSecret) {
  throw new Error("NEON_AUTH_COOKIE_SECRET is missing in the Worker runtime.");
}

export const auth = createNeonAuth({
  baseUrl: authBaseUrl,
  cookies: {
    secret: cookieSecret,
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
