import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { isDooraAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  userId: z.string().min(1).max(200),
  verified: z.boolean(),
});

export async function POST(request: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!isDooraAdmin(admin)) return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekli." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Doğrulama bilgilerini kontrol et." }, { status: 400 });

  try {
    const [updated] = await db`
      INSERT INTO public.user_profiles(user_id, is_verified)
      VALUES (${parsed.data.userId}, ${parsed.data.verified})
      ON CONFLICT(user_id) DO UPDATE SET is_verified = EXCLUDED.is_verified, updated_at = now()
      RETURNING user_id, is_verified
    `;
    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("[admin/verification] update failed", error);
    return NextResponse.json({ error: "Doğrulama durumu güncellenemedi." }, { status: 500 });
  }
}
