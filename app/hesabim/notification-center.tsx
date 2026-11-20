"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bildirimler alınamadı.");
      setItems(data.notifications || []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bildirimler alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function markRead(item: Notification) {
    if (!item.read_at) {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id })
      });
      if (response.ok) {
        setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
        setUnreadCount(current => Math.max(0, current - 1));
      }
    }
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true })
    });
    if (response.ok) {
      const now = new Date().toISOString();
      setItems(current => current.map(item => ({ ...item, read_at: item.read_at || now })));
      setUnreadCount(0);
    }
  }

  return <div className="notification-center">
    <button type="button" className="notification-trigger" aria-label="Bildirimler" aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) void load(); }}>
      <Bell/>
      {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
    {open && <section className="notification-panel" aria-label="Bildirimler">
      <div className="notification-panel-head"><strong>Bildirimler</strong>{unreadCount > 0 && <button type="button" onClick={markAllRead}>Tümünü okundu işaretle</button>}</div>
      <div className="notification-list">
        {loading && items.length === 0 ? <div className="notification-empty">Yükleniyor…</div>
          : error ? <div className="notification-error">{error}</div>
          : items.length === 0 ? <div className="notification-empty">Henüz bildirimin yok.</div>
          : items.map(item => <button type="button" key={item.id} className={"notification-item"+(!item.read_at?" is-unread":"")} onClick={() => void markRead(item)}>
            {!item.read_at && <span className="notification-item-dot"/>}
            <span className="notification-item-content"><strong>{item.title}</strong><span>{item.body}</span><small>{formatDate(item.created_at)}</small></span>
          </button>)}
      </div>
    </section>}
  </div>;
}
