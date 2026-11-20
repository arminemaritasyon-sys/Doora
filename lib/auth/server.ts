import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

type Auth = ReturnType<typeof createNeonAuth>;

let _auth: Auth | null = null;

function init(): Auth {
  if (_auth) return _auth;

  const baseUrl =
    process.env.NEON_AUTH_BASE_URL || process.env.NEXT_PUBLIC_NEON_AUTH_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl) {
    throw new Error("NEON_AUTH_BASE_URL tanımlı değil.");
  }
  if (!secret) {
    throw new Error("NEON_AUTH_COOKIE_SECRET tanımlı değil.");
  }

  _auth = createNeonAuth({
    baseUrl,
    cookies: {
      secret,
      sessionDataTtl: 300,
    },
  });

  return _auth;
}

// Lazy proxy: createNeonAuth() artık modül yüklenirken değil,
// ilk erişimde çalışır. Böylece build sırasında env değişkeni gerekmez.
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = init() as Record<string | symbol, unknown>;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
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
