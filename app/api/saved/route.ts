import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ taskIds: [] });
  try {
    const rows = await db`SELECT task_id FROM public.saved_tasks WHERE user_id=${user.id} ORDER BY created_at DESC`;
    return NextResponse.json({ taskIds: rows.map((row) => row.task_id) });
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
