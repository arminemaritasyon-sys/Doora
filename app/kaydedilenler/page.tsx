import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const money = (value: string | number) => new Intl.NumberFormat("tr-TR").format(Number(value)) + " ₺";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  const tasks = await db`SELECT t.id,t.title,t.description,t.category,t.budget,t.district,t.created_at FROM public.saved_tasks s JOIN public.tasks t ON t.id=s.task_id WHERE s.user_id=${user.id} ORDER BY s.created_at DESC LIMIT 100`;
  return (
    <main className="account-page">
      <header className="account-topbar"><Link className="brand" href="/"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></Link><Link className="account-home" href="/hesabim">Hesabım</Link></header>
      <div className="account-shell">
        <div className="account-welcome"><div><span className="eyebrow">KİŞİSEL LİSTEN</span><h1>Kaydettiğim ilanlar</h1><p>Sonra incelemek istediğin işler burada.</p></div></div>
        {tasks.length ? <div className="saved-grid">{tasks.map((task:any)=><article key={task.id}><span>{task.category} · {task.district}</span><h2>{task.title}</h2><p>{task.description}</p><strong>{money(task.budget)}</strong></article>)}</div> : <div className="account-empty-card"><h2>Henüz ilan kaydetmedin.</h2><p>İlgini çeken ilanları yer imine dokunarak burada saklayabilirsin.</p><Link href="/#kesfet">İlanları keşfet →</Link></div>}
      </div>
    </main>
  );
}
