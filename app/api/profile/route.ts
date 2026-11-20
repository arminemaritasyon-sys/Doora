import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const [profile] = await db`
    SELECT p.display_name, p.avatar_url, p.district, p.bio,
      COALESCE(n.task_updates, true) AS task_updates,
      COALESCE(n.offer_updates, true) AS offer_updates,
      COALESCE(n.wallet_updates, true) AS wallet_updates,
      COALESCE(n.product_updates, false) AS product_updates
    FROM (SELECT 1) seed
    LEFT JOIN public.user_profiles p ON p.user_id = ${user.id}
    LEFT JOIN public.user_notification_preferences n ON n.user_id = ${user.id}
  `;
  return NextResponse.json({ profile: { name: profile?.display_name || user.name || "", avatarUrl: profile?.avatar_url || "", district: profile?.district || "", bio: profile?.bio || "", notifications: { taskUpdates: profile?.task_updates ?? true, offerUpdates: profile?.offer_updates ?? true, walletUpdates: profile?.wallet_updates ?? true, productUpdates: profile?.product_updates ?? false } } });
}

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  district: z.string().trim().max(100).default(""),
  bio: z.string().trim().max(500).default(""),
  avatarUrl: z.string().max(1_000_000).default(""),
  notifications: z.object({
    taskUpdates: z.boolean(), offerUpdates: z.boolean(), walletUpdates: z.boolean(), productUpdates: z.boolean()
  })
});

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Profil bilgilerini kontrol et." }, { status: 400 });
  const { name, district, bio, avatarUrl, notifications } = parsed.data;
  if (avatarUrl && !/^data:image\/(png|jpeg|webp);base64,/.test(avatarUrl)) return NextResponse.json({ error: "Profil fotoğrafı PNG, JPG veya WEBP olmalı." }, { status: 400 });
  try {
    await db`
      INSERT INTO public.user_profiles(user_id, display_name, district, bio, avatar_url)
      VALUES (${user.id}, ${name}, ${district || null}, ${bio || null}, ${avatarUrl || null})
      ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name, district=EXCLUDED.district,
        bio=EXCLUDED.bio, avatar_url=EXCLUDED.avatar_url, updated_at=now()
    `;
    await db`
      INSERT INTO public.user_notification_preferences(user_id, task_updates, offer_updates, wallet_updates, product_updates)
      VALUES (${user.id}, ${notifications.taskUpdates}, ${notifications.offerUpdates}, ${notifications.walletUpdates}, ${notifications.productUpdates})
      ON CONFLICT(user_id) DO UPDATE SET task_updates=EXCLUDED.task_updates, offer_updates=EXCLUDED.offer_updates,
        wallet_updates=EXCLUDED.wallet_updates, product_updates=EXCLUDED.product_updates, updated_at=now()
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[profile] update failed", error);
    return NextResponse.json({ error: "Profil kaydedilemedi. Tekrar dene." }, { status: 500 });
  }
}
