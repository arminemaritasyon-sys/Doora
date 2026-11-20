import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Compass, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

const money = (value: string | number) => new Intl.NumberFormat("tr-TR").format(Number(value)) + " ₺";
const statusLabel: Record<string,string> = { open:"Yayında", assigned:"Eşleşti", completed:"Tamamlandı", cancelled:"İptal edildi", pending:"Bekliyor", accepted:"Kabul edildi", rejected:"Reddedildi", withdrawn:"Geri çekildi" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");

  const [tasks, received, sent, saved] = await Promise.all([
    db`SELECT id,title,budget,status,created_at FROM public.tasks WHERE owner_id=${user.id} ORDER BY created_at DESC LIMIT 10`,
    db`SELECT o.id,o.amount,o.status,o.created_at,t.id AS task_id,t.title,u.name AS bidder FROM public.offers o JOIN public.tasks t ON t.id=o.task_id LEFT JOIN neon_auth.user u ON u.id::text=o.user_id WHERE t.owner_id=${user.id} ORDER BY o.created_at DESC LIMIT 10`,
    db`SELECT o.id,o.amount,o.status,o.created_at,t.id AS task_id,t.title FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE o.user_id=${user.id} ORDER BY o.created_at DESC LIMIT 10`,
    db`SELECT count(*)::int AS count FROM public.saved_tasks WHERE user_id=${user.id}`
  ]);

  return (
    <main className="account-page profile-page">
      <header className="account-topbar"><Link className="brand" href="/"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></Link><LogoutButton /></header>
      <div className="account-shell profile-shell">
        <div className="profile-welcome">
          <div className="profile-avatar">{(user.name || "D").slice(0,1).toLocaleUpperCase("tr")}</div>
          <div className="profile-identity"><span className="eyebrow">HESABIM</span><h1>{user.name || "DOORA üyesi"}</h1><p>{user.email}</p></div>
        </div>
        <div className="account-stats profile-stats">
          <div><small>İlanlarım</small><strong>{tasks.length}</strong></div>
          <div><small>Gelen teklifler</small><strong>{received.length}</strong></div>
          <div><small>Verdiğim teklifler</small><strong>{sent.length}</strong></div>
          <Link href="/kaydedilenler"><small>Kaydedilenler</small><strong>{saved[0]?.count ?? 0}</strong></Link>
        </div>
        <section className="account-section profile-section"><div className="account-section-head"><h2>İlanlarım</h2><Link href="/#kesfet">Yeni ilan oluştur <span>↗</span></Link></div>
          {tasks.length ? <div className="account-list">{tasks.map((task:any)=><article key={task.id}><div><b>{task.title}</b><small>{new Date(task.created_at).toLocaleDateString("tr-TR")} · {statusLabel[task.status] || task.status}</small></div><strong>{money(task.budget)}</strong></article>)}</div> : <p className="account-empty">Henüz ilan oluşturmadın.</p>}
        </section>
        <section className="account-section profile-section"><div className="account-section-head"><h2>Gelen teklifler</h2></div>
          {received.length ? <div className="account-list">{received.map((offer:any)=><article key={offer.id}><div><b>{offer.bidder || "DOORA üyesi"} · {offer.title}</b><small>{new Date(offer.created_at).toLocaleDateString("tr-TR")} · {statusLabel[offer.status] || offer.status}</small></div><strong>{money(offer.amount)}</strong></article>)}</div> : <p className="account-empty">İlanlarına henüz teklif gelmedi.</p>}
        </section>
        <section className="account-section profile-section"><div className="account-section-head"><h2>Verdiğim teklifler</h2></div>
          {sent.length ? <div className="account-list">{sent.map((offer:any)=><article key={offer.id}><div><b>{offer.title}</b><small>{new Date(offer.created_at).toLocaleDateString("tr-TR")} · {statusLabel[offer.status] || offer.status}</small></div><strong>{money(offer.amount)}</strong></article>)}</div> : <p className="account-empty">Henüz teklif vermedin.</p>}
        </section>
      </div>
      <nav className="mobile-dock account-dock" aria-label="Ana gezinme">
        <Link href="/#kesfet"><Compass/><span>Keşfet</span></Link><Link href="/isler"><span className="dock-money-icon" aria-hidden="true">₺</span><span>İşler</span></Link><Link href="/kaydedilenler"><Bookmark/><span>Kaydedilen</span></Link><Link className="dock-active" href="/hesabim"><UserRound/><span>Hesabım</span></Link>
      </nav>
    </main>
  );
}
