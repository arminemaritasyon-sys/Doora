import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import LogoutButton from "./logout-button";
import AccountDashboard from "./account-dashboard";
import AppBottomNav from "@/components/app-bottom-nav";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");

  const [tasks, received, sent, saved, taskTotal, receivedTotal, sentTotal] = await Promise.all([
    db`SELECT t.id,t.title,t.budget,t.status,t.created_at,o.user_id AS assigned_user_id, EXISTS(SELECT 1 FROM public.task_reviews r WHERE r.task_id=t.id AND r.reviewer_id=${user.id}) AS reviewed FROM public.tasks t LEFT JOIN public.offers o ON o.id=t.assigned_offer_id WHERE t.owner_id=${user.id} ORDER BY t.created_at DESC LIMIT 30`,
    db`SELECT o.id,o.amount,o.status,o.created_at,t.id AS task_id,t.title,o.user_id AS bidder_id,
      COALESCE(NULLIF(p.display_name,''),NULLIF(u.name,''),'DOORA üyesi') AS bidder,
      p.avatar_url,p.district,
      COALESCE(rv.rating,0)::numeric AS rating,COALESCE(rv.review_count,0)::int AS review_count
      FROM public.offers o JOIN public.tasks t ON t.id=o.task_id
      LEFT JOIN public.user_profiles p ON p.user_id=o.user_id
      LEFT JOIN neon_auth.user u ON u.id::text=o.user_id
      LEFT JOIN LATERAL (SELECT avg(rating) AS rating,count(*) AS review_count FROM public.task_reviews WHERE reviewee_id=o.user_id) rv ON true
      WHERE t.owner_id=${user.id} ORDER BY o.created_at DESC LIMIT 30`,
    db`SELECT o.id,o.amount,o.status,o.created_at,t.id AS task_id,t.title FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE o.user_id=${user.id} ORDER BY o.created_at DESC LIMIT 10`,
    db`SELECT count(*)::int AS count FROM public.saved_tasks WHERE user_id=${user.id}`,
    db`SELECT count(*)::int AS count FROM public.tasks WHERE owner_id=${user.id}`,
    db`SELECT count(*)::int AS count FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE t.owner_id=${user.id}`,
    db`SELECT count(*)::int AS count FROM public.offers WHERE user_id=${user.id}`
  ]);

  const taskRows=tasks.map((x:any)=>({...x,created_at:String(x.created_at)}));
  const receivedRows=received.map((x:any)=>({...x,created_at:String(x.created_at),bidder:x.bidder==null?null:String(x.bidder)}));
  const sentRows=sent.map((x:any)=>({...x,created_at:String(x.created_at)}));

  return (
    <main className="doora-page doora-account-page">
      <header className="doora-app-header">
        <Link className="doora-brand" href="/"><span className="doora-brand-mark">d</span><span>doora<span>.</span></span></Link>
        <div className="doora-header-right"><Link href="/isler" className="header-discover">İşleri keşfet <ArrowUpRight size={15}/></Link><div className="header-logout"><LogoutButton/></div></div>
      </header>
      <div className="doora-page-container account-page-container">
        <div className="wallet-lite-page-title"><h1>Cüzdanım</h1><span>DOORA</span></div>
        <AccountDashboard name={user.name || "DOORA üyesi"} email={user.email || ""} tasks={taskRows} received={receivedRows} sent={sentRows} taskCount={Number(taskTotal[0]?.count ?? 0)} receivedCount={Number(receivedTotal[0]?.count ?? 0)} sentCount={Number(sentTotal[0]?.count ?? 0)} savedCount={Number(saved[0]?.count ?? 0)}/>
        <div className="account-page-footer"><span>DOORA · Günlük işler, kolay çözümler.</span><Link href="/kaydedilenler">Kaydedilen işlerin <ArrowUpRight size={14}/></Link></div>
      </div>
      <AppBottomNav active="account"/>
    </main>
  );
}
