import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("test_topup"), amount: z.coerce.number().positive().max(50000), idempotencyKey: z.string().uuid() }),
  z.object({ action: z.literal("withdraw"), amount: z.coerce.number().positive().max(50000), iban: z.string().trim().min(26,"IBAN bilgisi eksik.").max(32,"IBAN çok uzun.") })
]);

export async function GET() {
  try {
    const user = await Promise.race([
      getCurrentUser(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Oturum kontrolü zaman aşımına uğradı.")), 10000))
    ]);
    if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const withTimeout = <T,>(query: Promise<T>, label: string): Promise<T> =>
      Promise.race([
        query,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label + " sorgusu zaman aşımına uğradı.")), 12000))
      ]);

    await withTimeout(
      db`INSERT INTO public.wallet_accounts(user_id,mode) VALUES(${user.id},'test') ON CONFLICT(user_id) DO NOTHING`,
      "Cüzdan hazırlığı"
    );

    // Run independent reads together; sequential queries made the first cold request unnecessarily slow.
    const [accounts, transactions, withdrawals] = await Promise.all([
      withTimeout(db`SELECT available_balance,held_balance,currency,mode FROM public.wallet_accounts WHERE user_id=${user.id}`, "Bakiye"),
      withTimeout(db`SELECT id,type,amount,status,description,created_at FROM public.wallet_transactions WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 30`, "Hesap hareketleri"),
      withTimeout(db`SELECT id,amount,status,created_at FROM public.wallet_withdrawals WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 10`, "Para çekme geçmişi")
    ]);

    const account = accounts[0] ?? null;
    if (!account) throw new Error("Cüzdan hesabı bulunamadı.");
    return NextResponse.json({ account, transactions, withdrawals, testMode: true });
  } catch (error) {
    console.error("[wallet] GET failed", error);
    const message = error instanceof Error ? error.message : "Cüzdan bilgileri alınamadı.";
    const status = message.includes("zaman aşımına") ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "İşlem bilgilerini kontrol et." }, { status: 400 });
  try {
    if (parsed.data.action === "test_topup") {
      const [result] = await db`SELECT * FROM public.doora_test_topup(${user.id},${parsed.data.amount},${parsed.data.idempotencyKey})`;
      return NextResponse.json({ success: true, testMode: true, account: result });
    }
    const accountHolderName = user.name?.trim();
    if (!accountHolderName) return NextResponse.json({ error: "Para çekmek için profilinde ad soyad bilgisi bulunmalı." }, { status: 400 });
    const cleanIban = parsed.data.iban.replace(/\s/g, "").toUpperCase();
    const [withdrawal] = await db`SELECT * FROM public.doora_test_withdraw(${user.id},${parsed.data.amount},${cleanIban},${accountHolderName})`;
    return NextResponse.json({ success: true, testMode: true, withdrawal }, { status: 201 });
  } catch (error) {
    console.error("[wallet] action failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cüzdan işlemi tamamlanamadı." }, { status: 400 });
  }
}
