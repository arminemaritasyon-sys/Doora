import "server-only";
import type { DooraUser } from "@/lib/auth/server";

export type DooraAdminAccess = {
  allowed: boolean;
  configured: boolean;
};

/**
 * OpenNext exposes Cloudflare Worker runtime environment variables on process.env.
 * getCloudflareContext().env is for bindings, not dashboard environment variables.
 */
export function getDooraAdminAccess(user: DooraUser | null): DooraAdminAccess {
  const configuredEmails = process.env.DOORA_ADMIN_EMAILS || "";
  const allowed = configuredEmails
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean);
  const normalizedUserEmail = user?.email?.trim().toLocaleLowerCase("en-US") || "";

  return {
    allowed: Boolean(normalizedUserEmail) && allowed.includes(normalizedUserEmail),
    configured: allowed.length > 0,
  };
}

export function isDooraAdmin(user: DooraUser | null): boolean {
  return getDooraAdminAccess(user).allowed;
}
