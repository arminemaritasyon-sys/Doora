import "server-only";

import type { DooraUser } from "@/lib/auth/server";

/**
 * Admin erişimi yalnızca Cloudflare Worker ortamındaki DOORA_ADMIN_EMAILS
 * allowlist'i üzerinden verilir. İstemciden gelen role bilgisine güvenilmez.
 */
export function isDooraAdmin(user: DooraUser | null): boolean {
  if (!user?.email) return false;
  const allowed = (process.env.DOORA_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean);
  return allowed.includes(user.email.trim().toLocaleLowerCase("en-US"));
}
