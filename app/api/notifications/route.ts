import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  try {
    const [notifications, counts] = await Promise.all([
      db`
        SELECT id, type, title, body, href, read_at, created_at
        FROM public.notifications
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 25
      `,
      db`
        SELECT COUNT(*)::int AS count
        FROM public.notifications
        WHERE user_id = ${user.id} AND read_at IS NULL
      `
    ]);
    return NextResponse.json({ notifications, unreadCount: Number(counts[0]?.count || 0) });
  } catch (error) {
    console.error("[notifications] GET failed", error);
    return NextResponse.json({ error: "Bildirimler alınamadı." }, { status: 500 });
  }
}

const schema = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional()
}).refine(value => value.all === true || Boolean(value.id));

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz bildirim isteği." }, { status: 400 });

  try {
    if (parsed.data.all) {
      await db`UPDATE public.notifications SET read_at = now() WHERE user_id = ${user.id} AND read_at IS NULL`;
      return NextResponse.json({ success: true });
    }
    const rows = await db`
      UPDATE public.notifications
      SET read_at = COALESCE(read_at, now())
      WHERE id = ${parsed.data.id}::uuid AND user_id = ${user.id}
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: "Bildirim bulunamadı." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications] PATCH failed", error);
    return NextResponse.json({ error: "Bildirim güncellenemedi." }, { status: 500 });
  }
}
