export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const taskId = request.nextUrl.searchParams.get("taskId");
  const incoming = request.nextUrl.searchParams.get("incoming") === "1";
  try {
    if (incoming) {
      // Only offers sent to listings owned by the signed-in user belong in this inbox.
      const offers = await db`
        SELECT o.id, o.task_id, o.user_id, o.amount, o.message, o.status, o.rejection_reason, o.created_at,
          t.title AS task_title, t.district, t.budget AS task_budget, t.status AS task_status,
          t.work_started_at, t.completion_requested_at,
          COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS provider_name,
          p.avatar_url AS provider_avatar,
          COALESCE(p.is_verified, false) AS provider_verified
        FROM public.offers o
        JOIN public.tasks t ON t.id = o.task_id
        LEFT JOIN public.user_profiles p ON p.user_id = o.user_id
        LEFT JOIN neon_auth.user u ON u.id::text = o.user_id
        WHERE t.owner_id = ${user.id}
        ORDER BY CASE WHEN o.status = 'pending' THEN 0 ELSE 1 END, o.created_at DESC
        LIMIT 100
      `;
      return NextResponse.json({ offers });
    }
    if (request.nextUrl.searchParams.get("assigned") === "1") {
      // Accepted offers are shown separately as jobs the current user has been hired to do.
      const offers = await db`
        SELECT o.id, o.task_id, o.user_id, o.amount, o.message, o.status, o.created_at,
          t.title AS task_title, t.district, t.budget AS task_budget, t.status AS task_status,
          t.work_started_at, t.completion_requested_at, t.owner_id,
          COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'İlan sahibi') AS owner_name,
          p.avatar_url AS owner_avatar
        FROM public.offers o
        JOIN public.tasks t ON t.id = o.task_id
        LEFT JOIN public.user_profiles p ON p.user_id = t.owner_id
        LEFT JOIN neon_auth.user u ON u.id::text = t.owner_id
        WHERE o.user_id = ${user.id} AND o.status = 'accepted'
          AND t.status IN ('assigned','completed','disputed')
        ORDER BY t.updated_at DESC
        LIMIT 100
      `;
      return NextResponse.json({ offers });
    }
    if (taskId) {
      const [task] = await db`SELECT id FROM public.tasks WHERE id = ${taskId}::uuid AND owner_id = ${user.id} LIMIT 1`;
      if (!task) return NextResponse.json({ error: "Bu ilanı görüntüleme yetkin yok." }, { status: 403 });
      const offers = await db`
        SELECT o.id, o.task_id, o.user_id, o.amount, o.message, o.status, o.created_at,
          COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS provider_name,
          p.avatar_url AS provider_avatar,
          COALESCE(p.is_verified, false) AS provider_verified
        FROM public.offers o
        LEFT JOIN public.user_profiles p ON p.user_id = o.user_id
        LEFT JOIN neon_auth.user u ON u.id::text = o.user_id
        WHERE o.task_id = ${taskId}::uuid
        ORDER BY o.created_at DESC
        LIMIT 100
      `;
      return NextResponse.json({ offers });
    }
    const offers = await db`
      SELECT o.id, o.task_id, o.amount, o.message, o.status, o.rejection_reason, o.created_at,
        t.title AS task_title, t.district, t.budget AS task_budget, t.status AS task_status,
        COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS owner_name,
        p.avatar_url AS owner_avatar
      FROM public.offers o
      JOIN public.tasks t ON t.id = o.task_id
      LEFT JOIN public.user_profiles p ON p.user_id = t.owner_id
      LEFT JOIN neon_auth.user u ON u.id::text = t.owner_id
      WHERE o.user_id = ${user.id}
      ORDER BY o.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ offers });
  } catch (error) {
    console.error("[offers] GET failed", error);
    return NextResponse.json({ error: "Teklifler şu anda alınamıyor." }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendDooraEmail } from "@/lib/mail";
import { createNotification } from "@/lib/notifications";



const schema = z.object({ taskId: z.string().uuid(), amount: z.coerce.number().positive().max(10000000), message: z.string().trim().max(1000).optional() });

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Teklif vermek için giriş yapmalısın." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Teklif bilgilerini kontrol et." }, { status: 400 });
  const { taskId, amount, message = "" } = parsed.data;
  const [task] = await db`SELECT id, owner_id, title FROM public.tasks WHERE id=${taskId} AND status='open' LIMIT 1`;
  if (!task) return NextResponse.json({ error: "İlan bulunamadı veya artık açık değil." }, { status: 404 });
  const [acceptedOffer] = await db`SELECT 1 FROM public.offers WHERE task_id = ${taskId} AND status = 'accepted' LIMIT 1`;
  if (acceptedOffer) return NextResponse.json({ error: "Bu iş için teklif kabul edildi; yeni teklif alınmıyor." }, { status: 409 });
  if (task.owner_id === user.id) return NextResponse.json({ error: "Kendi ilanına teklif veremezsin." }, { status: 400 });
  const blocked = await db`SELECT 1 FROM public.user_blocks WHERE (blocker_id=${user.id} AND blocked_id=${task.owner_id}) OR (blocker_id=${task.owner_id} AND blocked_id=${user.id}) LIMIT 1`;
  if (blocked.length) return NextResponse.json({ error: "Bu kullanıcıyla aranızda engelleme bulunduğu için teklif veremezsin." }, { status: 403 });
  const [offer] = await db`
    INSERT INTO public.offers(task_id,user_id,amount,message)
    VALUES (${taskId},${user.id},${amount},${message})
    ON CONFLICT(task_id,user_id) DO UPDATE SET amount=EXCLUDED.amount,message=EXCLUDED.message,status='pending',updated_at=now()
    RETURNING id,task_id,amount,status,created_at
  `;
  const [provider] = await db`
    SELECT COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'Bir DOORA üyesi') AS name
    FROM neon_auth.user u
    LEFT JOIN public.user_profiles p ON p.user_id = u.id::text
    WHERE u.id = ${user.id}
    LIMIT 1
  `;
  const formattedAmount = amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  await createNotification({
    userId: task.owner_id,
    preference: "offer_updates",
    type: "new_offer",
    title: "Yeni teklif aldın",
    body: `${provider?.name || "Bir DOORA üyesi"}, “${task.title}” ilanına ${formattedAmount} TL teklif verdi.`,
    href: `/ilan/${taskId}`,
  });
  try {
  const [owner] = await db`SELECT email,name FROM neon_auth.user WHERE id=${task.owner_id} LIMIT 1`;
  if (owner?.email) await sendDooraEmail({ to:owner.email,userId:task.owner_id,template:"new_offer",subject:"İlanına yeni teklif geldi",html:`<h2>Yeni bir teklifin var.</h2><p><strong>${escapeHtml(task.title)}</strong> ilanına ${amount.toLocaleString("tr-TR")} TL teklif geldi.</p><p>DOORA hesabından teklifleri inceleyebilirsin.</p>` });
  } catch (error) { console.error("[mail] Delivery failed; marketplace action remains successful:", error); }
  return NextResponse.json({ offer }, { status: 201 });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]!));
}
