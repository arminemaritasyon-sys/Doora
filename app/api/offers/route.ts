import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendDooraEmail } from "@/lib/mail";

const schema = z.object({ taskId: z.string().uuid(), amount: z.coerce.number().positive(), message: z.string().trim().max(1000).optional() });

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Teklif vermek için giriş yapmalısın." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Teklif bilgilerini kontrol et." }, { status: 400 });
  const { taskId, amount, message = "" } = parsed.data;
  const [task] = await db`SELECT id, owner_id, title FROM public.tasks WHERE id=${taskId} AND status='open' LIMIT 1`;
  if (!task) return NextResponse.json({ error: "İlan bulunamadı veya artık açık değil." }, { status: 404 });
  if (task.owner_id === user.id) return NextResponse.json({ error: "Kendi ilanına teklif veremezsin." }, { status: 400 });
  const [offer] = await db`
    INSERT INTO public.offers(task_id,user_id,amount,message)
    VALUES (${taskId},${user.id},${amount},${message})
    ON CONFLICT(task_id,user_id) DO UPDATE SET amount=EXCLUDED.amount,message=EXCLUDED.message,status='pending',updated_at=now()
    RETURNING id,task_id,amount,status,created_at
  `;
  try {
  await db`
    INSERT INTO public.notifications(user_id,type,title,body,href)
    VALUES (${task.owner_id},'new_offer','Yeni teklif aldın',${task.title},${`/ilan/${taskId}`})
  `;
  } catch (error) { console.error("[notifications] Could not create notification:", error); }
  const [owner] = await db`SELECT email,name FROM neon_auth.user WHERE id=${task.owner_id} LIMIT 1`;
  try {
  if (owner?.email) await sendDooraEmail({ to:owner.email,userId:task.owner_id,template:"new_offer",subject:"İlanına yeni teklif geldi",html:`<h2>Yeni bir teklifin var.</h2><p><strong>${escapeHtml(task.title)}</strong> ilanına ${amount.toLocaleString("tr-TR")} TL teklif geldi.</p><p>DOORA hesabından teklifleri inceleyebilirsin.</p>` });
  } catch (error) { console.error("[mail] Delivery failed; marketplace action remains successful:", error); }
  return NextResponse.json({ offer }, { status: 201 });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]!));
}
