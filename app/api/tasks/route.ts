import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { sendDooraEmail } from "@/lib/mail";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const search = params.get("q")?.trim() || null;
    const mine = params.get("mine") === "1";
    const currentUser = mine ? await getCurrentUser() : null;
    if (mine && !currentUser) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
    const category = params.get("category") || null;
    const district = params.get("district") || null;
    const city = params.get("city") || null;
    const rows = await db`
      SELECT t.id, t.owner_id, t.title, t.description, t.category, t.budget, t.city,
        t.district AS location,
        COALESCE(to_char(t.scheduled_at, 'DD.MM.YYYY HH24:MI'), 'Yeni ilan') AS time,
        t.created_at, t.status, t.featured_until,
        COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS owner,
        CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS owner_avatar,
        (SELECT count(*)::int FROM public.offers o WHERE o.task_id=t.id) AS offers,
        COALESCE((SELECT json_agg(json_build_object('url','/api/tasks/image?id=' || ti.id::text) ORDER BY ti.created_at) FROM public.task_images ti WHERE ti.task_id=t.id), '[]'::json) AS images
      FROM public.tasks t
      LEFT JOIN public.user_profiles p ON p.user_id = t.owner_id
      LEFT JOIN neon_auth.user u ON u.id::text = t.owner_id
      WHERE (
          (${mine}::boolean = false AND t.status = 'open')
          OR (${mine}::boolean = true AND t.owner_id = ${currentUser?.id ?? ""})
        )
        AND (${category}::text IS NULL OR t.category = ${category})
        AND (${district}::text IS NULL OR t.district ILIKE ${district ? `%${district}%` : null})
        AND (${city}::text IS NULL OR t.city ILIKE ${city ? `%${city}%` : null})
        AND (${search}::text IS NULL OR (t.title || ' ' || t.description || ' ' || t.district) ILIKE ${search ? `%${search}%` : null})
      ORDER BY (t.featured_until > now()) DESC, t.created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ tasks: rows });
  } catch (error) {
    console.error("[tasks] Listing query failed:", error);
    return NextResponse.json({ error: "İlanlar şu anda alınamıyor." }, { status: 503 });
  }
}

const taskSchema = z.object({
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(10).max(5000),
  category: z.string().trim().min(2).max(60),
  budget: z.coerce.number().positive().max(10000000),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100).default("Antalya"),
  images: z.array(z.string().max(900000)).max(4).default([]),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "İlan oluşturmak için giriş yapmalısın." }, { status: 401 });
  const parsed = taskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "İlan bilgilerini kontrol et." }, { status: 400 });
  const { title, description, category, budget, district, city, images } = parsed.data;
  for (const image of images) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(image)) return NextResponse.json({ error: "Yalnızca JPG, PNG veya WEBP görsel ekleyebilirsin." }, { status: 400 });
  }
  await db`
    INSERT INTO public.user_profiles (user_id, display_name)
    VALUES (${user.id}, ${user.name || null})
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
      updated_at = now()
  `;
  const [task] = await db`
    INSERT INTO public.tasks (owner_id,title,description,category,budget,city,district)
    VALUES (${user.id},${title},${description},${category},${budget},${city},${district})
    RETURNING id,title,description,category,budget,district AS location,status,created_at
  `;
  const savedImages: { url: string }[] = [];
  for (const imageData of images) {
    const [imageRow] = await db`INSERT INTO public.task_images(task_id, image_data) VALUES (${task.id}, ${imageData}) RETURNING id`;
    savedImages.push({ url: `/api/tasks/image?id=${imageRow.id}` });
  }
  await createNotification({ userId: user.id, preference: "task_updates", type: "task_created", title: "İlanın yayınlandı", body: title, href: `/ilan/${task.id}` });
  try {
    await sendDooraEmail({ to:user.email, userId:user.id, template:"task_created", subject:"İlanın DOORA'da yayında", html:`<h2>Merhaba ${escapeHtml(user.name || "DOORA üyesi")},</h2><p><strong>${escapeHtml(title)}</strong> ilanını aldık. İlanın DOORA'da yayınlandı.</p><p>Teklif geldikçe seni bilgilendireceğiz.</p>` });
  } catch (error) { console.error("[mail] Delivery failed; marketplace action remains successful:", error); }
  return NextResponse.json({ task: { ...task, city, images: savedImages, time: "Yeni ilan", owner: user.name || "Sen", offers: 0 } }, { status: 201 });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[char]!));
}
