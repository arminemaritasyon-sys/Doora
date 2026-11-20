import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type EmailType = "welcome" | "task_created" | "offer_received" | "offer_accepted" | "offer_rejected";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char] || char));

const templates: Record<Exclude<EmailType, "welcome">, (title: string, amount?: number) => { subject: string; heading: string; body: string }> = {
  task_created: (title, amount) => ({ subject: "İlanın DOORA'da yayınlandı", heading: "İlanın yayında!", body: `“${title}” ilanını yayınladın. ${amount ? `Belirlediğin ücret: ${amount.toLocaleString("tr-TR")} ₺.` : ""} Yeni teklifler geldikçe seni bilgilendireceğiz.` }),
  offer_received: (title, amount) => ({ subject: "İlanına yeni bir teklif geldi", heading: "Yeni bir teklifin var", body: `“${title}” ilanına ${amount ? `${amount.toLocaleString("tr-TR")} ₺ tutarında` : "yeni"} bir teklif geldi. DOORA hesabından teklifin detaylarını inceleyebilirsin.` }),
  offer_accepted: (title, amount) => ({ subject: "Teklifin kabul edildi", heading: "Harika, teklifin kabul edildi!", body: `“${title}” işi için teklifin kabul edildi. ${amount ? `Teklif tutarın: ${amount.toLocaleString("tr-TR")} ₺.` : ""} İşin ayrıntılarını DOORA hesabından takip edebilirsin.` }),
  offer_rejected: (title) => ({ subject: "Teklifin hakkında güncelleme", heading: "Teklifin bu kez seçilmedi", body: `“${title}” işi için teklifin iş sahibi tarafından seçilmedi. DOORA'daki diğer fırsatları keşfetmeye devam edebilirsin.` }),
};

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!supabaseUrl || !anonKey || !serviceKey || !resendKey || !from) {
      return NextResponse.json({ error: "E-posta servisi henüz yapılandırılmadı." }, { status: 503 });
    }

    const payload = await request.json() as { type?: EmailType; entityId?: string };
    const allowed: EmailType[] = ["welcome", "task_created", "offer_received", "offer_accepted", "offer_rejected"];
    if (!payload.type || !allowed.includes(payload.type) || !payload.entityId || payload.entityId.length > 100) {
      return NextResponse.json({ error: "Geçersiz bildirim isteği." }, { status: 400 });
    }

    const sessionClient = await createClient();
    const { data: authData, error: authError } = await sessionClient.auth.getUser();
    const actor = authData.user;
    if (authError || !actor) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const admin = createAdminClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    let recipientId = actor.id;
    let title = "DOORA'ya hoş geldin";
    let amount: number | undefined;
    const eventKey = `${payload.type}:${payload.entityId}`;

    if (payload.type === "task_created") {
      const { data, error } = await admin.from("tasks").select("id,owner_id,title,budget").eq("id", payload.entityId).single();
      if (error || !data || data.owner_id !== actor.id) return NextResponse.json({ error: "İlan doğrulanamadı." }, { status: 403 });
      title = data.title;
      amount = data.budget;
    } else if (payload.type === "offer_received" || payload.type === "offer_accepted" || payload.type === "offer_rejected") {
      const { data, error } = await admin.from("offers").select("id,sender_id,amount,tasks!inner(owner_id,title)").eq("id", payload.entityId).single();
      if (error || !data) return NextResponse.json({ error: "Teklif bulunamadı." }, { status: 404 });
      const task = Array.isArray(data.tasks) ? data.tasks[0] : data.tasks;
      if (!task) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
      if (payload.type === "offer_received") {
        if (data.sender_id !== actor.id) return NextResponse.json({ error: "Teklif sahibi doğrulanamadı." }, { status: 403 });
        recipientId = task.owner_id;
      } else {
        if (task.owner_id !== actor.id) return NextResponse.json({ error: "İş sahibi doğrulanamadı." }, { status: 403 });
        recipientId = data.sender_id;
      }
      title = task.title;
      amount = data.amount;
    } else if (payload.entityId !== actor.id) {
      return NextResponse.json({ error: "Kullanıcı doğrulanamadı." }, { status: 403 });
    }

    const { data: recipientData, error: recipientError } = await admin.auth.admin.getUserById(recipientId);
    const recipientEmail = recipientData.user?.email;
    if (recipientError || !recipientEmail) return NextResponse.json({ error: "Alıcı e-posta adresi bulunamadı." }, { status: 404 });

    const { data: alreadySent } = await admin.from("email_events").select("id,status").eq("event_key", eventKey).maybeSingle();
    if (alreadySent?.status === "sent") return NextResponse.json({ ok: true, duplicate: true });

    const { error: logError } = await admin.from("email_events").upsert({
      recipient_id: recipientId, event_type: payload.type, event_key: eventKey, status: "pending",
    }, { onConflict: "event_key" });
    if (logError) throw logError;

    const content = payload.type === "welcome"
      ? { subject: "DOORA'ya hoş geldin", heading: "İyi ki geldin!", body: "DOORA'da küçük işleri kolayca paylaşabilir, çevrendeki insanlardan destek alabilir ve sen de başkalarına yardımcı olabilirsin." }
      : templates[payload.type](title, amount);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const html = `<!doctype html><html lang="tr"><body style="margin:0;background:#f6f7f3;font-family:Arial,sans-serif;color:#171a16;padding:32px 16px"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8ebe4;border-radius:18px;padding:34px"><div style="font-size:28px;font-weight:800;letter-spacing:-1px">doora<span style="color:#9db64d">.</span></div><h1 style="font-size:25px;margin:30px 0 12px">${escapeHtml(content.heading)}</h1><p style="font-size:15px;line-height:1.7;color:#60685c">${escapeHtml(content.body)}</p><a href="${siteUrl}" style="display:inline-block;margin-top:20px;padding:14px 22px;border-radius:999px;background:#1b2019;color:#fff;text-decoration:none;font-weight:700">DOORA'yı aç</a><p style="font-size:11px;color:#92998d;margin-top:34px">Bu e-posta DOORA hesabındaki işlemler hakkında otomatik olarak gönderilmiştir.</p></div></body></html>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipientEmail], subject: content.subject, html, text: `${content.heading}\n\n${content.body}\n\n${siteUrl}` }),
    });
    const result = await response.json() as { id?: string; message?: string };
    if (!response.ok) {
      await admin.from("email_events").update({ status: "failed", error_message: result.message || "Resend gönderim hatası" }).eq("event_key", eventKey);
      return NextResponse.json({ error: "E-posta gönderilemedi." }, { status: 502 });
    }
    await admin.from("email_events").update({ status: "sent", provider_message_id: result.id || null, sent_at: new Date().toISOString(), error_message: null }).eq("event_key", eventKey);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bildirim gönderilirken beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
