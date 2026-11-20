import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { id } = await context.params;
  try {
    const [result] = await db`SELECT * FROM public.doora_accept_offer(${user.id},${id}::uuid)`;
    return NextResponse.json({ success: true, escrow: result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Teklif kabul edilemedi." }, { status: 400 });
  }
}
