import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ reason: z.string().trim().max(500).default("") });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Red nedenini kontrol et." }, { status: 400 });

  try {
    const [offer] = await db`
      UPDATE public.offers AS o
      SET status = 'rejected',
          rejection_reason = ${parsed.data.reason || null},
          updated_at = now()
      FROM public.tasks AS t
      WHERE o.id = ${id}::uuid
        AND t.id = o.task_id
        AND t.owner_id = ${user.id}
        AND o.status = 'pending'
      RETURNING o.id, o.user_id, o.task_id
    `;

    if (!offer) {
      return NextResponse.json(
        { error: "Teklif bulunamadı veya artık reddedilemiyor." },
        { status: 404 }
      );
    }

    await createNotification({
      userId: offer.user_id,
      preference: "offer_updates",
      type: "offer_rejected",
      title: "Teklifin yanıtlandı",
      body: parsed.data.reason ? "Teklifin reddedildi. Neden: " + parsed.data.reason : "İlan sahibi teklifini reddetti.",
      href: "/ilan/" + offer.task_id
    });

    return NextResponse.json({ success: true, offerId: offer.id });
  } catch (error) {
    console.error("[offers] reject failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Teklif reddedilemedi." },
      { status: 500 }
    );
  }
}
