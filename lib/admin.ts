import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { DooraUser } from "@/lib/auth/server";

/**
 * Admin erişimi yalnızca Cloudflare Worker runtime allowlist'i üzerinden verilir.
 * Cloudflare binding önceliklidir; process.env yerel geliştirme için yedektir.
 */
export function isDooraAdmin(user: DooraUser | null): boolean {
  if (!user?.email) return false;

  let configuredEmails = process.env.DOORA_ADMIN_EMAILS || "";

  try {
    const runtimeEnv = getCloudflareContext().env as Record<string, unknown>;
    const runtimeValue = runtimeEnv.DOORA_ADMIN_EMAILS;
    if (typeof runtimeValue === "string" && runtimeValue.trim()) {
      configuredEmails = runtimeValue;
    }
  } catch {
    // next dev / Node.js dışı ortamda process.env yedeğini kullan.
  }

  const allowed = configuredEmails
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean);

  return allowed.includes(user.email.trim().toLocaleLowerCase("en-US"));
}
