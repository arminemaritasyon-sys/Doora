import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";

type MailInput = { to: string; userId?: string; template: string; subject: string; html: string };

export async function sendDooraEmail(input: MailInput) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    await db`INSERT INTO public.email_events (user_id,recipient_email,template,status,error_message)
      VALUES (${input.userId ?? null},${input.to},${input.template},'failed','RESEND_API_KEY veya RESEND_FROM_EMAIL eksik')`;
    return { sent: false, reason: "email_provider_not_configured" as const };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (result.error) {
    await db`INSERT INTO public.email_events (user_id,recipient_email,template,status,error_message)
      VALUES (${input.userId ?? null},${input.to},${input.template},'failed',${result.error.message})`;
    return { sent: false, reason: result.error.message };
  }
  await db`INSERT INTO public.email_events (user_id,recipient_email,template,provider_message_id,status)
    VALUES (${input.userId ?? null},${input.to},${input.template},${result.data?.id ?? null},'sent')`;
  return { sent: true };
}
