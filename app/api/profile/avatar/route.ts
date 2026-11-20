import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")?.trim();
  if (!userId || userId.length > 200) {
    return NextResponse.json({ error: "Profil fotoğrafı bulunamadı." }, { status: 404 });
  }

  try {
    const [profile] = await db`
      SELECT avatar_url, updated_at
      FROM public.user_profiles
      WHERE user_id=${userId}
      LIMIT 1
    `;
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(profile?.avatar_url || "");
    if (!match || match[2].length > 5_000_000) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    }

    const etag = `"${new Date(profile.updated_at).getTime().toString(16)}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
    }

    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": `image/${match[1]}`,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "ETag": etag,
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-site"
      }
    });
  } catch (error) {
    console.error("[profile avatar] failed", error);
    return NextResponse.json({ error: "Profil fotoğrafı yüklenemedi." }, { status: 500 });
  }
}
