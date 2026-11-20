import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  action: z.enum(["start", "mark_done", "confirm_complete", "not_done"]),
  reason: z.string().trim().max(1000).default("")
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İşlem bilgilerini kontrol et." }, { status: 400 });
  const { action, reason } = parsed.data;

  try {
    const [task] = await db`
      SELECT t.id,t.owner_id,t.title,t.status,t.work_started_at,t.completion_requested_at,o.user_id AS provider_id,o.amount
      FROM public.tasks t LEFT JOIN public.offers o ON o.id=t.assigned_offer_id
      WHERE t.id=${id}::uuid LIMIT 1
    `;
    if (!task || !task.provider_id) return NextResponse.json({ error: "Atanmış iş bulunamadı." }, { status: 404 });
    const isOwner = task.owner_id === user.id;
    const isProvider = task.provider_id === user.id;

    if (action === "start" || action === "mark_done") {
      if (!isProvider) return NextResponse.json({ error: "Bu işlem yalnızca işi üstlenen kişi tarafından yapılabilir." }, { status: 403 });
      if (action === "start") {
        const rows = await db`UPDATE public.tasks SET work_started_at=COALESCE(work_started_at,now()),updated_at=now() WHERE id=${id}::uuid AND status='assigned' AND work_started_at IS NULL RETURNING id`;
        if (!rows.length) return NextResponse.json({ error: "İş başlatma aşamasında değil." }, { status: 409 });
        await createNotification({ userId: task.owner_id, preference: "task_updates", type: "work_started", title: "İş başladı", body: task.title + " işi hizmet veren tarafından başlatıldı.", href: "/hesabim" });
        return NextResponse.json({ success: true, status: "assigned", workStarted: true });
      }
      if (!task.work_started_at) return NextResponse.json({ error: "Önce işe başladığını bildirmen gerekiyor." }, { status: 409 });
      const rows = await db`UPDATE public.tasks SET completion_requested_at=now(),updated_at=now() WHERE id=${id}::uuid AND status='assigned' AND completion_requested_at IS NULL RETURNING id`;
      if (!rows.length) return NextResponse.json({ error: "İş tamamlandı olarak işaretlenemiyor." }, { status: 409 });
      await createNotification({ userId: task.owner_id, preference: "task_updates", type: "work_done", title: "İş tamamlandı olarak bildirildi", body: task.title + " işi için tamamlanma onayı bekleniyor.", href: "/hesabim" });
      return NextResponse.json({ success: true, status: "assigned", awaitingConfirmation: true });
    }

    if (!isOwner) return NextResponse.json({ error: "Bu işlem yalnızca ilan sahibi tarafından yapılabilir." }, { status: 403 });
    if (action === "confirm_complete") {
      if (task.status !== "assigned" || !task.completion_requested_at) return NextResponse.json({ error: "Hizmet veren henüz işi tamamlandı olarak bildirmedi." }, { status: 409 });
      const [released] = await db`SELECT * FROM public.doora_complete_task(${user.id},${id}::uuid)`;
      await createNotification({ userId: task.provider_id, preference: "wallet_updates", type: "work_approved", title: "İşin onaylandı", body: task.title + " işi onaylandı, emanet ödeme cüzdanına aktarıldı.", href: "/hesabim" });
      return NextResponse.json({ success: true, released });
    }

    if (task.status !== "assigned" || !task.completion_requested_at) return NextResponse.json({ error: "Sorun bildirimi için önce tamamlanma talebi gelmeli." }, { status: 409 });
    if (reason.trim().length < 5) return NextResponse.json({ error: "Lütfen sorunu en az 5 karakterle açıkla." }, { status: 400 });
    const [dispute] = await db`
      WITH updated_task AS (
        UPDATE public.tasks
        SET status='disputed',updated_at=now()
        WHERE id=${id}::uuid AND status='assigned' AND completion_requested_at IS NOT NULL
        RETURNING id
      ),
      upserted_dispute AS (
        INSERT INTO public.task_disputes(task_id,opened_by,reason,details)
        SELECT id,${user.id},'work_not_completed',${reason} FROM updated_task
        ON CONFLICT(task_id) DO UPDATE SET opened_by=EXCLUDED.opened_by,reason=EXCLUDED.reason,
          details=EXCLUDED.details,status='open',created_at=now(),resolved_at=NULL
        RETURNING task_id
      )
      SELECT task_id FROM upserted_dispute
    `;
    if (!dispute) return NextResponse.json({ error: "İşin durumu değişti. Sayfayı yenileyip tekrar kontrol et." }, { status: 409 });
    await createNotification({ userId: task.provider_id, preference: "task_updates", type: "work_disputed", title: "İş için sorun bildirildi", body: task.title + " işi için tamamlanmadı bildirimi yapıldı: " + reason, href: "/hesabim" });
    return NextResponse.json({ success: true, status: "disputed" });
  } catch (error) {
    console.error("[task workflow] failed", error);
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
    return NextResponse.json({ error: error instanceof Error ? error.message : "İşlem tamamlanamadı." }, { status: code === "P0001" ? 409 : 500 });
  }
}
