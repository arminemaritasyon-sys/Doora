import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kaydedilen ilanları görmek için giriş yapmalısın." }, { status: 401 });
  try {
    const rows = await db`
      SELECT t.id, t.owner_id, t.title, t.description, t.category, t.budget, t.city,
        t.district AS location,
        COALESCE(to_char(t.scheduled_at, 'DD.MM.YYYY HH24:MI'), 'Yeni ilan') AS time,
        t.created_at, t.status, t.featured_until,
        COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS owner,
        CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS owner_avatar,
        (SELECT count(*)::int FROM public.offers o WHERE o.task_id=t.id) AS offers,
        COALESCE((SELECT json_agg(json_build_object('url','/api/tasks/image?id=' || ti.id::text) ORDER BY ti.created_at) FROM public.task_images ti WHERE ti.task_id=t.id), '[]'::json) AS images
      FROM public.saved_tasks s
      JOIN public.tasks t ON t.id=s.task_id
      LEFT JOIN public.user_profiles p ON p.user_id=t.owner_id
      LEFT JOIN neon_auth.user u ON u.id::text=t.owner_id
      WHERE s.user_id=${user.id}
      ORDER BY s.created_at DESC
    `;
    return NextResponse.json({ taskIds: rows.map((row) => row.id), tasks: rows });
  } catch (error) {
    console.error("[saved] GET failed", error);
    return NextResponse.json({ error: "Kaydedilen işler alınamadı." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Kaydetmek için giriş yapmalısın." }, { status: 401 });
  const body = z.object({ taskId: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "İlan bilgisi geçersiz." }, { status: 400 });
  try {
    const removed = await db`DELETE FROM public.saved_tasks WHERE user_id=${user.id} AND task_id=${body.data.taskId} RETURNING task_id`;
    if (removed.length) return NextResponse.json({ saved: false });
    await db`INSERT INTO public.saved_tasks(user_id,task_id) VALUES(${user.id},${body.data.taskId}) ON CONFLICT DO NOTHING`;
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("[saved] POST failed", error);
    return NextResponse.json({ error: "İlan kaydedilemedi. Tekrar dene." }, { status: 500 });
  }
}
