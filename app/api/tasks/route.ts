import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendDooraEmail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get("q")?.trim() || null;
  const category = params.get("category") || null;
  const district = params.get("district") || null;
  const rows = await db`
    SELECT t.id, t.title, t.description, t.category, t.budget, t.city,
      t.district AS location,
      COALESCE(to_char(t.scheduled_at, 'DD.MM.YYYY HH24:MI'), 'Yeni ilan') AS time,
      t.created_at, t.status,
      COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS owner,
      (SELECT count(*)::int FROM public.offers o WHERE o.task_id=t.id) AS offers
    FROM public.tasks t
    LEFT JOIN public.user_profiles p ON p.user_id = t.owner_id
    LEFT JOIN neon_auth.user u ON u.id::text = t.owner_id
    WHERE t.status = 'open'
      AND (${category}::text IS NULL OR t.category = ${category})
      AND (${district}::text IS NULL OR t.district ILIKE ${district ? `%${district}%` : null})
      AND (${search}::text IS NULL OR (t.title || ' ' || t.description || ' ' || t.district) ILIKE ${search ? `%${search}%` : null})
    ORDER BY t.created_at DESC
    LIMIT 60
  `;
  return NextResponse.json({ tasks: rows });
}

const taskSchema = z.object({
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(60),
  budget: z.coerce.number().positive().max(10000000),
  district: z.string().trim().min(2).max(100),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "İlan oluşturmak için giriş yapmalısın." }, { status: 401 });
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İlan bilgilerini kontrol et." }, { status: 400 });
  const { title, description, category, budget, district } = parsed.data;
  await db`
    INSERT INTO public.user_profiles (user_id, display_name)
    VALUES (${user.id}, ${user.name || null})
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
      updated_at = now()
  `;
  const [task] = await db`
    INSERT INTO public.tasks (owner_id,title,description,category,budget,district)
    VALUES (${user.id},${title},${description},${category},${budget},${district})
    RETURNING id,title,description,category,budget,district AS location,status,created_at
  `;
  try {
  await db`
    INSERT INTO public.notifications (user_id,type,title,body,href)
    VALUES (${user.id},'task_created','İlanın yayınlandı',${title},${`/ilan/${task.id}`})
  `;
  } catch (error) { console.error("[notifications] Could not create notification:", error); }
  try {
  await sendDooraEmail({ to:user.email, userId:user.id, template:"task_created", subject:"İlanın DOORA'da yayında", html:`<h2>Merhaba ${escapeHtml(user.name || "DOORA üyesi")},</h2><p><strong>${escapeHtml(title)}</strong> ilanını aldık. İlanın DOORA'da yayınlandı.</p><p>Teklif geldikçe seni bilgilendireceğiz.</p>` });
  } catch (error) { console.error("[mail] Delivery failed; marketplace action remains successful:", error); }
  return NextResponse.json({ task: { ...task, time: "Yeni ilan", owner: user.name || "Sen", offers: 0 } }, { status: 201 });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]!));
}
