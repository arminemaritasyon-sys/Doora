import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Compass, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const money = (value: string | number) => new Intl.NumberFormat("tr-TR").format(Number(value)) + " ₺";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  const tasks = await db`SELECT t.id,t.title,t.description,t.category,t.budget,t.district,t.created_at FROM public.saved_tasks s JOIN public.tasks t ON t.id=s.task_id WHERE s.user_id=${user.id} ORDER BY s.created_at DESC LIMIT 100`;
  return (
    <main className="account-page saved-page">
      <header className="account-topbar"><Link className="brand" href="/"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></Link><Link className="account-home" href="/isler">İşleri keşfet</Link></header>
      <div className="account-shell saved-shell">
        <div className="saved-heading">
          <div><span className="eyebrow">SANA AYIRDIKLARIN</span><h1>Kaydedilenler</h1><p>İlgini çeken işler, tekrar bakman için burada.</p></div>
          <span className="saved-count">{tasks.length} kayıt</span>
        </div>
        {tasks.length ? <div className="saved-grid">{tasks.map((task:any)=><article className="saved-card" key={task.id}>
          <div className="saved-card-meta"><span>{task.category}</span><small>{task.district}</small></div>
          <h2>{task.title}</h2><p>{task.description}</p>
          <div className="saved-card-bottom"><strong>{money(task.budget)}</strong><Link href="/isler">İşi görüntüle <span>↗</span></Link></div>
        </article>)}</div> : <div className="saved-empty">
          <span className="saved-empty-icon"><Bookmark size={22}/></span><h2>Henüz kaydettiğin bir iş yok</h2>
          <p>Beğendiğin işleri yer imi simgesiyle kaydet. İstediğin zaman buradan ulaşabilirsin.</p>
          <Link href="/isler">İşleri keşfet <span>↗</span></Link>
        </div>}
      </div>
      <nav className="mobile-dock account-dock" aria-label="Ana gezinme">
        <Link href="/#kesfet"><Compass/><span>Keşfet</span></Link><Link href="/isler"><span className="dock-money-icon" aria-hidden="true">₺</span><span>İşler</span></Link><Link className="dock-active" href="/kaydedilenler"><Bookmark/><span>Kaydedilen</span></Link><Link href="/hesabim"><UserRound/><span>Hesabım</span></Link>
      </nav>
    </main>
  );
}
