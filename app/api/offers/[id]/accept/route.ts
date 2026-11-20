import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await context.params;
  try {
    const [offer] = await db`SELECT o.user_id,o.task_id,t.title FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE o.id=${id}::uuid AND t.owner_id=${user.id} AND o.status='pending' LIMIT 1`;
    if (!offer) return NextResponse.json({ error: "Teklif bulunamadı veya artık kabul edilemiyor." }, { status: 404 });
    const blocked = await db`SELECT 1 FROM public.user_blocks WHERE (blocker_id=${user.id} AND blocked_id=${offer.user_id}) OR (blocker_id=${offer.user_id} AND blocked_id=${user.id}) LIMIT 1`;
    if (blocked.length) return NextResponse.json({ error: "Bu kullanıcıyla aranızda engelleme bulunduğu için teklif kabul edilemez." }, { status: 403 });
    const otherOffers = await db`SELECT user_id FROM public.offers WHERE task_id=${offer.task_id}::uuid AND status='pending' AND id<>${id}::uuid`;
    const [result] = await db`SELECT * FROM public.doora_accept_offer(${user.id},${id}::uuid)`;
    try {
      await db`INSERT INTO public.notifications(user_id,type,title,body,href) VALUES(${offer.user_id},'offer_accepted','Teklifin kabul edildi',${offer.title + " ilanındaki teklifin kabul edildi. İş detaylarını hesabından takip edebilirsin."},'/hesabim')`;
    } catch (notificationError) {
      console.error("[offers] accepted notification failed after escrow commit", notificationError);
    }
    for (const other of otherOffers) {
      try {
        await db`INSERT INTO public.notifications(user_id,type,title,body,href) VALUES(${other.user_id},'offer_not_selected','Teklif sonucu',${offer.title + " ilanında başka bir teklif kabul edildi."},${"/ilan/" + offer.task_id})`;
      } catch (notificationError) {
        console.error("[offers] non-selected notification failed", notificationError);
      }
    }
    return NextResponse.json({ success: true, escrow: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Teklif kabul edilemedi." }, { status: 400 });
  }
}
