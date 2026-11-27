import { db } from "@/lib/db";

export type NotificationPreference = "task_updates" | "offer_updates" | "wallet_updates" | "product_updates";
type NotificationInput = {
  userId: string;
  preference: NotificationPreference;
  type: string;
  title: string;
  body: string;
  href: string;
};

let cachedAccessToken: { value: string; expiresAt: number } | null = null;
const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

async function firebaseAccessToken(serviceAccount: { client_email: string; private_key: string; token_uri?: string }) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const unsigned = header + "." + claim;
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binary, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + base64Url(signature);
  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("Firebase OAuth token request failed: " + response.status);
  const data = await response.json() as { access_token: string; expires_in?: number };
  cachedAccessToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return data.access_token;
}

async function sendPush(userId: string, notificationId: string, input: NotificationInput) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) { console.error("[notifications] FIREBASE_SERVICE_ACCOUNT_JSON is missing"); return; }
    const account = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string; token_uri?: string };
    const devices = await db`SELECT token FROM public.user_notification_devices WHERE user_id = ${userId}`;
    if (!devices.length) { console.error("[notifications] no registered devices for recipient"); return; }
    const accessToken = await firebaseAccessToken(account);
    const endpoint = "https://fcm.googleapis.com/v1/projects/" + account.project_id + "/messages:send";
    await Promise.all(devices.map(async (device) => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: "Bearer " + accessToken, "content-type": "application/json" },
        body: JSON.stringify({ message: {
          token: device.token,
          notification: { title: input.title, body: input.body },
          data: { type: input.type, href: input.href, notificationId },
          android: { priority: "HIGH", notification: { channel_id: "doora_updates", sound: "default", click_action: "FLUTTER_NOTIFICATION_CLICK" } },
        } }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error("[notifications] FCM rejected push", { status: response.status, detail });
        if (response.status === 404 || response.status === 400) {
          if (detail.includes("UNREGISTERED") || detail.includes("registration-token-not-registered")) {
            await db`DELETE FROM public.user_notification_devices WHERE token = ${device.token}`;
          }
        }
      } else {
        console.info("[notifications] FCM accepted push", { status: response.status });
      }
    }));
  } catch (error) {
    console.error("[notifications] push delivery failed", error);
  }
}

/** Persist in-app notification and deliver a push when the user has a registered device. */
export async function createNotification(input: NotificationInput): Promise<boolean> {
  try {
    const defaultEnabled = input.preference !== "product_updates";
    const rows = await db`
      INSERT INTO public.notifications(user_id, type, title, body, href)
      SELECT ${input.userId}, ${input.type}, ${input.title}, ${input.body}, ${input.href}
      WHERE COALESCE((
        SELECT CASE ${input.preference}
          WHEN 'task_updates' THEN task_updates
          WHEN 'offer_updates' THEN offer_updates
          WHEN 'wallet_updates' THEN wallet_updates
          WHEN 'product_updates' THEN product_updates
          ELSE false
        END
        FROM public.user_notification_preferences
        WHERE user_id = ${input.userId}
        LIMIT 1
      ), ${defaultEnabled})
      RETURNING id
    `;
    if (!rows.length) return false;
    await sendPush(input.userId, String(rows[0].id), input);
    return true;
  } catch (error) {
    console.error("[notifications] persistence failed", error);
    return false;
  }
}
