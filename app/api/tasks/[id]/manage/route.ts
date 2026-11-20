import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { z } from "zod";

const schema = z.object({ action: z.enum(["pause","publish","complete"]) });
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  try {
    if (parsed.data.action === "complete") {
      const [result] = await db`SELECT * FROM public.doora_complete_task(${user.id},${id}::uuid)`;
      return NextResponse.json({ success: true, released: result });
    }
    const status = parsed.data.action === "pause" ? "paused" : "open";
    const rows = await db`UPDATE public.tasks SET status=${status},updated_at=now() WHERE id=${id}::uuid AND owner_id=${user.id} AND status IN ('open','paused') RETURNING id,status`;
    if (!rows.length) return NextResponse.json({ error: "İlan bulunamadı veya bu işlem için uygun değil." }, { status: 404 });
    return NextResponse.json({ success: true, task: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "İlan güncellenemedi." }, { status: 400 });
  }
}
