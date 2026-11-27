import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
const schema = z.object({
  token: z.string().min(30).max(4096),
  platform: z.enum(["android", "ios"]).default("android"),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bildirim cihazı bilgisi geçersiz." }, { status: 400 });
  try {
    await db`
      INSERT INTO public.user_notification_devices(user_id, token, platform, updated_at)
      VALUES (${user.id}, ${parsed.data.token}, ${parsed.data.platform}, now())
      ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id, platform=EXCLUDED.platform, updated_at=now()
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications] device registration failed", error);
    return NextResponse.json({ error: "Bildirim cihazı kaydedilemedi." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.pick({ token: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bildirim cihazı bilgisi geçersiz." }, { status: 400 });
  await db`DELETE FROM public.user_notification_devices WHERE user_id = ${user.id} AND token = ${parsed.data.token}`;
  return NextResponse.json({ success: true });
}
