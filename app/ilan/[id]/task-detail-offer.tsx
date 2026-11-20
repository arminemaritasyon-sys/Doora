"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

export default function TaskDetailOffer({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, amount: Number(amount), message })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        router.push("/giris?next="+encodeURIComponent(window.location.pathname));
        return;
      }
      if (!response.ok) throw new Error(data.error || "Teklif gönderilemedi.");
      toast.success("Teklifin ilan sahibine iletildi.");
      setOpen(false);
      router.push("/hesabim");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Teklif gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="task-detail-primary" style={{ border: 0, cursor: "pointer", font: "inherit" }} onClick={() => setOpen(true)}>
      Teklif ver <ArrowRight size={17}/>
    </button>
    {open && <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="task-detail-offer-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">TEKLİFİNİ GÖNDER</span><h2 id="task-detail-offer-title">{taskTitle}</h2></div>
          <button type="button" className="icon-button" onClick={() => !busy && setOpen(false)} aria-label="Kapat"><X/></button>
        </div>
        <form className="task-form" onSubmit={submit}>
          <label>Teklif tutarı (₺)<input type="number" min="1" max="10000000" step="0.01" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Teklifin" required/></label>
          <label>Mesaj <span className="optional-label">İsteğe bağlı</span><textarea rows={3} maxLength={1000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Kısaca kendinden ve çözümünden bahset..."/></label>
          <button className="button button-primary button-full" disabled={busy}>{busy ? "Gönderiliyor…" : "Teklifi gönder"} <ArrowRight size={17}/></button>
        </form>
      </section>
    </div>}
  </>;
}
