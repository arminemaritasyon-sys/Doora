import "server-only";
import { cookies } from "next/headers";

export type DooraUser = { id: string; email: string; name?: string | null };

export async function getCurrentUser(): Promise<DooraUser | null> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL tanımlı değil.");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/get-session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const user = payload?.user ?? payload?.session?.user;
  return user?.id && user?.email ? { id: String(user.id), email: String(user.email), name: user.name ?? null } : null;
}
