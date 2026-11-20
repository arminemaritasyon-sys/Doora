import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

const schema = z.object({ taskId: z.string().uuid(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).default("") });
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Değerlendirme bilgilerini kontrol et." }, { status: 400 });
  const { taskId, rating, comment } = parsed.data;
  const [task] = await db`SELECT t.owner_id,o.user_id AS provider_id FROM public.tasks t LEFT JOIN public.offers o ON o.id=t.assigned_offer_id WHERE t.id=${taskId} AND t.status='completed' LIMIT 1`;
  if (!task || (task.owner_id !== user.id && task.provider_id !== user.id)) return NextResponse.json({ error: "Bu iş için değerlendirme yapamazsın." }, { status: 403 });
  const reviewee = task.owner_id === user.id ? task.provider_id : task.owner_id;
  if (!reviewee) return NextResponse.json({ error: "İş eşleşmesi bulunamadı." }, { status: 400 });
  try {
    const [result] = await db`INSERT INTO public.task_reviews(task_id,reviewer_id,reviewee_id,rating,comment) VALUES(${taskId},${user.id},${reviewee},${rating},${comment}) RETURNING id,rating,comment,created_at`;
    return NextResponse.json({ review: result }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    if (code === "23505") {
      return NextResponse.json({ error: "Bu iş için daha önce değerlendirme yapmışsın." }, { status: 409 });
    }
    console.error("[reviews] create failed", error);
    return NextResponse.json({ error: "Değerlendirme kaydedilemedi. Tekrar dene." }, { status: 500 });
  }
}
