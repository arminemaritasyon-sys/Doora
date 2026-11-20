import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookmarkCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import AppBottomNav from "@/components/app-bottom-nav";
import SavedExplorer, { type SavedTask } from "./saved-explorer";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  const [rows,pendingOffers] = await Promise.all([\n    db`SELECT t.id,t.title,t.description,t.category,t.budget,t.district,t.created_at FROM public.saved_tasks s JOIN public.tasks t ON t.id=s.task_id WHERE s.user_id=${user.id} ORDER BY s.created_at DESC LIMIT 100`,\n    db`SELECT count(*)::int AS count FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE t.owner_id=${user.id} AND o.status='pending'`\n  ]);
  const tasks: SavedTask[] = rows.map((task:any) => ({
    id:String(task.id), title:String(task.title), description:task.description == null ? null : String(task.description),
    category:task.category == null ? null : String(task.category), budget:task.budget,
    district:task.district == null ? null : String(task.district), created_at:String(task.created_at)
  }));

  return (
    <main className="doora-page doora-saved-page">
      <header className="doora-app-header">
        <Link className="doora-brand" href="/"><span className="doora-brand-mark">d</span><span>doora<span>.</span></span></Link>
        <div className="doora-header-right"><span className="header-context"><BookmarkCheck size={15}/> Kişisel listen</span><Link href="/isler" className="header-discover">İşleri keşfet <ArrowUpRight size={15}/></Link></div>
      </header>
      <div className="doora-page-container">
        <section className="saved-page-hero">
          <div className="saved-hero-copy"><span className="doora-section-kicker"><i/> SENİN SEÇİMLERİN</span><h1>Kaydettiklerin,<br/><em>hep elinin altında.</em></h1><p>İlgini çeken işleri bir arada tut. Hazır olduğunda kaldığın yerden devam et.</p></div>
          <div className="saved-hero-visual" aria-hidden="true"><div className="saved-visual-ring ring-large"/><div className="saved-visual-ring ring-small"/><div className="saved-visual-bookmark"><BookmarkCheck size={34}/></div><span className="saved-visual-dot dot-a"/><span className="saved-visual-dot dot-b"/></div>
          <div className="saved-hero-count"><strong>{tasks.length.toString().padStart(2,"0")}</strong><span>kaydedilmiş iş</span></div>
        </section>
        <section className="saved-content-section"><div className="saved-content-heading"><div><span className="doora-section-kicker">KOLEKSİYONUN</span><h2>Kaydedilen işler</h2></div><span className="saved-private-label"><span/> Yalnızca sana özel</span></div>
          <SavedExplorer initialTasks={tasks}/>
        </section>
      </div>
      <AppBottomNav active="saved" pendingOffers={Number(pendingOffers[0]?.count ?? 0)}/>
    </main>
  );
}
