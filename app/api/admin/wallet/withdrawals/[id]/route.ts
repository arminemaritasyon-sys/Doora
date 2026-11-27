import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { isDooraAdmin } from "@/lib/admin";
import { createNotification } from "@/lib/notifications";

const schema = z.object({ status: z.enum(["approved", "rejected"]) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (!isDooraAdmin(admin)) return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gerekli." }, { status: 403 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Çekim durumu geçersiz." }, { status: 400 });

  try {
    const [withdrawal] = await db`
      WITH changed AS (
        UPDATE public.wallet_withdrawals
        SET status = ${parsed.data.status}, updated_at = now()
        WHERE id = ${id}::uuid AND status = 'pending'
        RETURNING id, user_id, amount, status
      ),
      refunded AS (
        UPDATE public.wallet_accounts AS account
        SET available_balance = account.available_balance + changed.amount,
            updated_at = now()
        FROM changed
        WHERE changed.status = 'rejected' AND account.user_id = changed.user_id
        RETURNING account.user_id
      ),
      ledger AS (
        INSERT INTO public.wallet_transactions(user_id, type, amount, status, description, metadata)
        SELECT user_id, 'withdrawal_rejected', amount, 'completed',
          'Reddedilen para çekme talebi bakiyeye iade edildi.',
          jsonb_build_object('withdrawalId', id)
        FROM changed WHERE status = 'rejected'
        RETURNING id
      )
      SELECT id, user_id, amount, status FROM changed
    `;
    if (!withdrawal) return NextResponse.json({ error: "Bekleyen çekim talebi bulunamadı." }, { status: 404 });
    const amount = Number(withdrawal.amount).toLocaleString("tr-TR");
    const approved = withdrawal.status === "approved";
    await createNotification({
      userId: withdrawal.user_id,
      preference: "wallet_updates",
      type: approved ? "withdrawal_approved" : "withdrawal_rejected",
      title: approved ? "Para çekim talebin onaylandı" : "Para çekim talebin reddedildi",
      body: approved
        ? amount + " TL tutarındaki çekim talebin onaylandı."
        : amount + " TL tutarındaki çekim talebin reddedildi. Tutar cüzdanına iade edildi.",
      href: "/hesabim",
    });
    return NextResponse.json({ success: true, withdrawal });
  } catch (error) {
    console.error("[admin/wallet/withdrawals] update failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Çekim talebi güncellenemedi." }, { status: 500 });
  }
}
