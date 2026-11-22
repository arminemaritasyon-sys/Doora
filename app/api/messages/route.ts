import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const peerId = request.nextUrl.searchParams.get("peerId");
  const rawTaskId = request.nextUrl.searchParams.get("taskId");
  const taskId = rawTaskId && /^[0-9a-f-]{36}$/i.test(rawTaskId) ? rawTaskId : null;

  try {
    if (peerId) {
      if (peerId === user.id || peerId.length > 200) {
        return NextResponse.json({ error: "Sohbet bulunamadı." }, { status: 400 });
      }
      await db`
        UPDATE public.direct_messages SET read_at = now()
        WHERE sender_id = ${peerId} AND recipient_id = ${user.id}
          AND task_id IS NOT DISTINCT FROM ${taskId}::uuid AND read_at IS NULL
      `;
      const messages = await db`
        SELECT id, sender_id, recipient_id, task_id, body, read_at, created_at
        FROM public.direct_messages
        WHERE ((sender_id = ${user.id} AND recipient_id = ${peerId})
          OR (sender_id = ${peerId} AND recipient_id = ${user.id}))
          AND task_id IS NOT DISTINCT FROM ${taskId}::uuid
        ORDER BY created_at ASC
        LIMIT 150
      `;
      const [peer] = await db`
        SELECT COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS name,
          p.avatar_url AS avatar_url
        FROM neon_auth.user u
        LEFT JOIN public.user_profiles p ON p.user_id = u.id::text
        WHERE u.id::text = ${peerId}
        LIMIT 1
      `;
      return NextResponse.json({ messages, peer: peer ?? null });
    }

    const conversations = await db`
      WITH scoped AS (
        SELECT CASE WHEN sender_id = ${user.id} THEN recipient_id ELSE sender_id END AS peer_id,
          sender_id, recipient_id, task_id, body, created_at,
          CASE WHEN recipient_id = ${user.id} AND read_at IS NULL THEN 1 ELSE 0 END AS unread
        FROM public.direct_messages
        WHERE sender_id = ${user.id} OR recipient_id = ${user.id}
      ), ranked AS (
        SELECT *, row_number() OVER (PARTITION BY peer_id, task_id ORDER BY created_at DESC) AS rn,
          sum(unread) OVER (PARTITION BY peer_id, task_id) AS unread_count
        FROM scoped
      )
      SELECT r.peer_id, r.task_id, r.body, r.created_at, r.unread_count,
        COALESCE(NULLIF(p.display_name, ''), NULLIF(u.name, ''), 'DOORA üyesi') AS peer_name,
        p.avatar_url AS peer_avatar,
        t.title AS task_title
      FROM ranked r
      LEFT JOIN neon_auth.user u ON u.id::text = r.peer_id
      LEFT JOIN public.user_profiles p ON p.user_id = r.peer_id
      LEFT JOIN public.tasks t ON t.id = r.task_id
      WHERE r.rn = 1
      ORDER BY r.created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[messages] GET failed", error);
    return NextResponse.json({ error: "Mesajlar şu anda alınamıyor." }, { status: 503 });
  }
}

const schema = z.object({
  recipientId: z.string().min(1).max(200),
  taskId: z.string().uuid().optional().nullable(),
  message: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Mesaj bilgilerini kontrol et." }, { status: 400 });

  const { recipientId, taskId, message } = parsed.data;
  if (recipientId === user.id) return NextResponse.json({ error: "Kendine mesaj gönderemezsin." }, { status: 400 });

  try {
    const [blocked] = await db`
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = ${user.id} AND blocked_id = ${recipientId})
         OR (blocker_id = ${recipientId} AND blocked_id = ${user.id})
      LIMIT 1
    `;
    if (blocked) return NextResponse.json({ error: "Bu kullanıcıyla mesajlaşma mümkün değil." }, { status: 403 });

    if (taskId) {
      const [task] = await db`SELECT id FROM public.tasks WHERE id = ${taskId} LIMIT 1`;
      if (!task) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
    }

    const [created] = await db`
      INSERT INTO public.direct_messages(sender_id, recipient_id, task_id, body)
      VALUES (${user.id}, ${recipientId}, ${taskId || null}, ${message})
      RETURNING id, sender_id, recipient_id, task_id, body, read_at, created_at
    `;
    await createNotification({
      userId: recipientId,
      preference: "task_updates",
      type: "new_message",
      title: "Yeni mesajın var",
      body: message.length > 100 ? message.slice(0, 97) + "..." : message,
      href: "/hesabim",
    });
    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    console.error("[messages] POST failed", error);
    return NextResponse.json({ error: "Mesaj gönderilemedi. Tekrar dene." }, { status: 500 });
  }
}
