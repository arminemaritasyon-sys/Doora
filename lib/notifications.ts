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

/** Best-effort notification persistence that respects the recipient's saved preferences. */
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
      RETURNING user_id
    `;
    return rows.length > 0;
  } catch (error) {
    console.error("[notifications] persistence failed", error);
    return false;
  }
}
