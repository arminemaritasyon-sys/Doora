import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), userId: z.string().min(1).max(200) }),
  z.object({ action: z.literal("report"), userId: z.string().min(1).max(200).optional(), taskId: z.string().uuid().optional(), category: z.string().trim().min(2).max(60), details: z.string().trim().max(1000).default("") })
]);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bildirim bilgilerini kontrol et." }, { status: 400 });
  const data = parsed.data;
  if (data.action === "block") {
    if (data.userId === user.id) return NextResponse.json({ error: "Kendini engelleyemezsin." }, { status: 400 });
    await db`INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(${user.id},${data.userId}) ON CONFLICT DO NOTHING`;
    return NextResponse.json({ success: true, blocked: true });
  }
  if (!data.userId && !data.taskId) return NextResponse.json({ error: "Şikâyet edilecek kullanıcı veya ilan seç." }, { status: 400 });
  if (data.userId === user.id) return NextResponse.json({ error: "Kendini şikâyet edemezsin." }, { status: 400 });
  await db`INSERT INTO public.user_reports(reporter_id,reported_user_id,task_id,category,details) VALUES(${user.id},${data.userId || null},${data.taskId || null},${data.category},${data.details})`;
  if (data.userId) {
    await db`INSERT INTO public.notifications(user_id,type,title,body,href) VALUES(${data.userId},'safety_report_received','Güvenlik bildirimi alındı','Hakkında bir bildirim alındı. DOORA ekibi inceleyecek.',${"/hesabim"})`;
  }
  return NextResponse.json({ success: true });
}
