import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { DooraUser } from "@/lib/auth/server";

export type DooraAdminAccess = {
  allowed: boolean;
  configured: boolean;
  source: "cloudflare-runtime" | "process-env" | "missing" | "runtime-error";
};

/**
 * Read the allowlist from the request's actual Cloudflare Worker environment.
 * process.env is only a fallback for local development.
 */
export function getDooraAdminAccess(user: DooraUser | null): DooraAdminAccess {
  if (!user?.email) {
    return { allowed: false, configured: false, source: "missing" };
  }

  let configuredEmails = "";
  let source: DooraAdminAccess["source"] = "missing";

  try {
    const runtimeEnv = getCloudflareContext().env as Record<string, unknown>;
    const runtimeValue = runtimeEnv.DOORA_ADMIN_EMAILS;

    if (typeof runtimeValue === "string" && runtimeValue.trim()) {
      configuredEmails = runtimeValue;
      source = "cloudflare-runtime";
    }
  } catch (error) {
    console.error("[admin] Unable to read Cloudflare runtime bindings:", error);
    source = "runtime-error";
  }

  if (!configuredEmails.trim()) {
    const localValue = process.env.DOORA_ADMIN_EMAILS || "";
    if (localValue.trim()) {
      configuredEmails = localValue;
      source = "process-env";
    }
  }

  const allowed = configuredEmails
    .split(",")
    .map((email) => email.trim().toLocaleLowerCase("en-US"))
    .filter(Boolean);

  const normalizedUserEmail = user.email.trim().toLocaleLowerCase("en-US");

  return {
    allowed: allowed.includes(normalizedUserEmail),
    configured: allowed.length > 0,
    source,
  };
}

export function isDooraAdmin(user: DooraUser | null): boolean {
  return getDooraAdminAccess(user).allowed;
}
