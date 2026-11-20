import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
const taskSchema = z.object({
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(60),
  budget: z.coerce.number().positive().max(10000000),
  district: z.string().trim().min(2).max(100),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await context.params;
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İlan bilgilerini kontrol et." }, { status: 400 });
  try {
    const { title, description, category, budget, district } = parsed.data;
    const rows = await db`
      UPDATE public.tasks
      SET title=${title},description=${description},category=${category},budget=${budget},district=${district},updated_at=now()
      WHERE id=${id}::uuid AND owner_id=${user.id} AND status IN ('open','paused')
      RETURNING id,title,description,category,budget,district,status,updated_at
    `;
    if (!rows.length) return NextResponse.json({ error: "İlan bulunamadı veya artık düzenlenemiyor." }, { status: 404 });
    return NextResponse.json({ success: true, task: rows[0] });
  } catch (error) {
    console.error("[tasks] update failed", error);
    return NextResponse.json({ error: "İlan güncellenemedi." }, { status: 400 });
  }
}
