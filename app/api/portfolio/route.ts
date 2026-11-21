import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId || userId.length > 200) return NextResponse.json({ error: "Profil bulunamadı." }, { status: 400 });
  const items = await db`
    SELECT id, title, description, image_data AS "imageData", created_at AS "createdAt"
    FROM public.service_portfolio_items
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 24
  `;
  return NextResponse.json({ items });
}

const schema = z.object({
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  imageData: z.string().min(1).max(1_800_000)
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Portföy bilgilerini kontrol et." }, { status: 400 });
  const { title, description, imageData } = parsed.data;
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(imageData)) return NextResponse.json({ error: "Yalnızca JPG, PNG veya WEBP görsel ekleyebilirsin." }, { status: 400 });
  const [count] = await db`SELECT count(*)::int AS count FROM public.service_portfolio_items WHERE user_id=${user.id}`;
  if (Number(count?.count || 0) >= 24) return NextResponse.json({ error: "Portföyünde en fazla 24 çalışma olabilir." }, { status: 400 });
  const [item] = await db`
    INSERT INTO public.service_portfolio_items(user_id,title,description,image_data)
    VALUES (${user.id},${title},${description},${imageData})
    RETURNING id,title,description,image_data AS "imageData",created_at AS "createdAt"
  `;
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Portföy kaydı bulunamadı." }, { status: 400 });
  const rows = await db`DELETE FROM public.service_portfolio_items WHERE id=${id}::uuid AND user_id=${user.id} RETURNING id`;
  if (!rows.length) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });
  return NextResponse.json({ success: true });
}
