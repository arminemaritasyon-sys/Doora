import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Görsel bulunamadı." }, { status: 400 });
  }
  try {
    const [row] = await db`SELECT image_data FROM public.task_images WHERE id = ${id}::uuid LIMIT 1`;
    if (!row?.image_data) return NextResponse.json({ error: "Görsel bulunamadı." }, { status: 404 });
    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(row.image_data);
    if (!match) return NextResponse.json({ error: "Görsel okunamadı." }, { status: 415 });
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const contentType = match[1] === "jpeg" ? "image/jpeg" : `image/${match[1]}`;
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[task-image] read failed:", error);
    return NextResponse.json({ error: "Görsel şu anda alınamıyor." }, { status: 503 });
  }
}
