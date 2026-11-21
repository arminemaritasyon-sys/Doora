import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ tasks: [], district: null });
    const [profile] = await db`SELECT district FROM public.user_profiles WHERE user_id=${user.id} LIMIT 1`;
    const district = String(profile?.district || "").trim();
    if (!district) return NextResponse.json({ tasks: [], district: null });
    const tasks = await db`
      SELECT t.id,t.title,t.description,t.category,t.budget,t.district AS location,
        COALESCE(to_char(t.scheduled_at,'DD.MM.YYYY HH24:MI'),'Yeni ilan') AS time,
        t.created_at,t.owner_id,
        COALESCE(NULLIF(p.display_name,''),NULLIF(u.name,''),'DOORA üyesi') AS owner,
        CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS owner_avatar,
        (SELECT count(*)::int FROM public.offers o WHERE o.task_id=t.id) AS offers
      FROM public.tasks t
      LEFT JOIN public.user_profiles p ON p.user_id=t.owner_id
      LEFT JOIN neon_auth.user u ON u.id::text=t.owner_id
      WHERE t.status='open' AND lower(t.district)=lower(${district}) AND t.owner_id<>${user.id}
      ORDER BY t.created_at DESC LIMIT 12
    `;
    return NextResponse.json({ tasks, district });
  } catch (error) {
    console.error("[tasks/nearby] Query failed:", error);
    return NextResponse.json({ tasks: [], district: null });
  }
}
