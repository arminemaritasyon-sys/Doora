import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["pause","publish","edit"]),
  title: z.string().trim().min(5).max(100).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  budget: z.coerce.number().positive().max(10000000).optional(),
  images: z.array(z.string().max(900000)).max(4).optional(),
});
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz işlem." }, { status: 400 });
  try {
    if (parsed.data.action === "edit") {
      const { title, description, budget } = parsed.data;
      const images = parsed.data.images ?? [];
      if (!title && !description && budget == null && images.length === 0) return NextResponse.json({ error: "En az bir alanı değiştirmelisin." }, { status: 400 });
      for (const image of images) {
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) return NextResponse.json({ error: "Yalnızca JPG, PNG veya WEBP görsel ekleyebilirsin." }, { status: 400 });
      }
      if (images.length) {
        const [count] = await db`SELECT count(*)::int AS total FROM public.task_images WHERE task_id=${id}::uuid`;
        if (Number(count?.total ?? 0) + images.length > 4) return NextResponse.json({ error: "Bir ilana en fazla 4 fotoğraf ekleyebilirsin." }, { status: 400 });
      }
      const rows = await db`
        UPDATE public.tasks SET title=COALESCE(${title ?? null},title), description=COALESCE(${description ?? null},description),
          budget=COALESCE(${budget ?? null},budget), updated_at=now()
        WHERE id=${id}::uuid AND owner_id=${user.id} AND status IN ('open','paused')
        RETURNING id,title,description,category,budget,district AS location,status,created_at
      `;
      if (!rows.length) return NextResponse.json({ error: "İlan bulunamadı veya düzenlemeye kapalı." }, { status: 404 });
      const savedImages: { url: string }[] = [];
      for (const imageData of images) {
        const [imageRow] = await db`INSERT INTO public.task_images(task_id,image_data) VALUES (${id}::uuid,${imageData}) RETURNING id`;
        savedImages.push({ url: `/api/tasks/image?id=${imageRow.id}` });
      }
      return NextResponse.json({ success: true, task: { ...rows[0], images: savedImages } });
    }
    const status = parsed.data.action === "pause" ? "paused" : "open";
    const rows = await db`UPDATE public.tasks SET status=${status},updated_at=now() WHERE id=${id}::uuid AND owner_id=${user.id} AND status IN ('open','paused') RETURNING id,status`;
    if (!rows.length) return NextResponse.json({ error: "İlan bulunamadı veya bu işlem için uygun değil." }, { status: 404 });
    return NextResponse.json({ success: true, task: rows[0] });
  } catch (error) {
    console.error("[task manage] update failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "İlan güncellenemedi." }, { status: 500 });
  }
}
