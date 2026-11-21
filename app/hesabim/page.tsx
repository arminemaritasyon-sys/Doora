import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import AccountSettings from "./account-settings";
import { getCurrentUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import LogoutButton from "./logout-button";
import AccountDashboard from "./account-dashboard";
import NotificationCenter from "./notification-center";
import AppBottomNav from "@/components/app-bottom-nav";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?next=%2Fhesabim");

  // Keep account rendering independent from a stalled Neon query.
  const withTimeout = <T,>(query: Promise<T>, label: string): Promise<T> =>
    Promise.race([
      query,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[account] ${label} query timed out after 8s`)), 8000))
    ]);

  const queryResults = await Promise.allSettled([
    withTimeout(db`SELECT t.id,t.title,t.description,t.category,t.district,t.budget,t.status,t.created_at,t.work_started_at,t.completion_requested_at,o.user_id AS assigned_user_id,
      COALESCE(NULLIF(ap.display_name,''),NULLIF(au.name,''),'DOORA üyesi') AS assigned_user_name,
      CASE WHEN ap.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || ap.user_id || '&v=' || floor(extract(epoch from ap.updated_at)*1000)::bigint::text END AS assigned_user_avatar,
      EXISTS(SELECT 1 FROM public.task_reviews r WHERE r.task_id=t.id AND r.reviewer_id=${user.id}) AS reviewed
      FROM public.tasks t LEFT JOIN public.offers o ON o.id=t.assigned_offer_id
      LEFT JOIN public.user_profiles ap ON ap.user_id=o.user_id LEFT JOIN neon_auth.user au ON au.id::text=o.user_id
      WHERE t.owner_id=${user.id} ORDER BY t.created_at DESC LIMIT 30`, "owned tasks"),
    withTimeout(db`SELECT o.id,o.amount,o.status,o.rejection_reason,o.message,o.created_at,t.id AS task_id,t.title,o.user_id AS bidder_id,
      COALESCE(NULLIF(p.display_name,''),NULLIF(u.name,''),'DOORA üyesi') AS bidder,
      CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS avatar_url,p.district,
      COALESCE(rv.rating,0)::numeric AS rating,COALESCE(rv.review_count,0)::int AS review_count,COALESCE(p.is_verified,false) AS is_verified
      FROM public.offers o JOIN public.tasks t ON t.id=o.task_id
      LEFT JOIN public.user_profiles p ON p.user_id=o.user_id
      LEFT JOIN neon_auth.user u ON u.id::text=o.user_id
      LEFT JOIN LATERAL (SELECT avg(rating) AS rating,count(*) AS review_count FROM public.task_reviews WHERE reviewee_id=o.user_id) rv ON true
      WHERE t.owner_id=${user.id} ORDER BY o.created_at DESC LIMIT 30`, "received offers"),
    withTimeout(db`SELECT o.id,o.task_id,o.amount,o.status,o.rejection_reason,o.message,o.created_at,t.title,t.owner_id AS bidder_id,
      COALESCE(NULLIF(p.display_name,''),NULLIF(u.name,''),'DOORA üyesi') AS bidder,COALESCE(p.is_verified,false) AS is_verified,CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS avatar_url,p.district
      FROM public.offers o JOIN public.tasks t ON t.id=o.task_id
      LEFT JOIN public.user_profiles p ON p.user_id=t.owner_id LEFT JOIN neon_auth.user u ON u.id::text=t.owner_id
      WHERE o.user_id=${user.id} ORDER BY o.created_at DESC LIMIT 30`, "sent offers"),
    withTimeout(db`SELECT t.id,t.title,t.description,t.category,t.district,t.budget,t.status,t.created_at,t.work_started_at,t.completion_requested_at,t.owner_id AS owner_id,
      COALESCE(NULLIF(p.display_name,''),NULLIF(u.name,''),'DOORA üyesi') AS owner_name,
      CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS avatar_url,
      EXISTS(SELECT 1 FROM public.task_reviews r WHERE r.task_id=t.id AND r.reviewer_id=${user.id}) AS reviewed
      FROM public.tasks t JOIN public.offers o ON o.id=t.assigned_offer_id
      LEFT JOIN public.user_profiles p ON p.user_id=t.owner_id LEFT JOIN neon_auth.user u ON u.id::text=t.owner_id
      WHERE o.user_id=${user.id} ORDER BY t.updated_at DESC LIMIT 30`, "assigned tasks"),
    withTimeout(db`SELECT count(*)::int AS count FROM public.tasks WHERE owner_id=${user.id}`, "task count"),
    withTimeout(db`SELECT count(*)::int AS count FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE t.owner_id=${user.id}`, "offer count"),
    withTimeout(db`SELECT count(*)::int AS count FROM public.offers o JOIN public.tasks t ON t.id=o.task_id WHERE t.owner_id=${user.id} AND o.status='pending'`, "pending offer count"),
    withTimeout(db`
      WITH ensured AS (
        INSERT INTO public.wallet_accounts(user_id,mode)
        VALUES(${user.id},'test')
        ON CONFLICT(user_id) DO NOTHING
      )
      SELECT
        (SELECT json_build_object(
          'account', json_build_object(
            'available_balance', wa.available_balance,
            'held_balance', wa.held_balance,
            'currency', wa.currency,
            'mode', wa.mode
          ),
          'transactions', COALESCE((
            SELECT json_agg(json_build_object(
              'id', tx.id, 'type', tx.type, 'amount', tx.amount,
              'status', tx.status, 'description', tx.description, 'created_at', tx.created_at
            ))
            FROM (
              SELECT id,type,amount,status,description,created_at
              FROM public.wallet_transactions
              WHERE user_id=${user.id}
              ORDER BY created_at DESC LIMIT 30
            ) tx
          ), '[]'::json),
          'withdrawals', COALESCE((
            SELECT json_agg(json_build_object(
              'id', w.id, 'amount', w.amount, 'status', w.status, 'created_at', w.created_at
            ))
            FROM (
              SELECT id,amount,status,created_at
              FROM public.wallet_withdrawals
              WHERE user_id=${user.id}
              ORDER BY created_at DESC LIMIT 10
            ) w
          ), '[]'::json),
          'testMode', true
        ) FROM public.wallet_accounts wa WHERE wa.user_id=${user.id}) AS wallet
    `, "wallet data"),
    withTimeout(db`SELECT display_name FROM public.user_profiles WHERE user_id=${user.id} LIMIT 1`, "profile name")
  ]);

  const [tasksResult, receivedResult, sentOffersResult, assignedResult, taskTotalResult, receivedTotalResult, pendingOffersResult, walletResult, profileNameResult] = queryResults;
  const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : (console.error("[account] tasks query failed", tasksResult.reason), []);
  const received = receivedResult.status === "fulfilled" ? receivedResult.value : (console.error("[account] received offers query failed", receivedResult.reason), []);
  const sentOffers = sentOffersResult.status === "fulfilled" ? sentOffersResult.value : (console.error("[account] sent offers query failed", sentOffersResult.reason), []);
  const assigned = assignedResult.status === "fulfilled" ? assignedResult.value : (console.error("[account] assigned tasks query failed", assignedResult.reason), []);
  const taskTotal = taskTotalResult.status === "fulfilled" ? taskTotalResult.value : (console.error("[account] task count query failed", taskTotalResult.reason), [{ count: 0 }]);
  const receivedTotal = receivedTotalResult.status === "fulfilled" ? receivedTotalResult.value : (console.error("[account] received count query failed", receivedTotalResult.reason), [{ count: 0 }]);
  const pendingOffers = pendingOffersResult.status === "fulfilled" ? pendingOffersResult.value : (console.error("[account] pending offers count query failed", pendingOffersResult.reason), [{ count: 0 }]);
  const walletInitialData = walletResult.status === "fulfilled" ? walletResult.value[0]?.wallet ?? null : null;
  const walletInitialError = walletResult.status === "fulfilled" && walletInitialData ? "" : "Cüzdan bilgileri şu anda alınamadı.";
  const accountName = profileNameResult.status === "fulfilled"
    ? (profileNameResult.value[0]?.display_name || user.name || "DOORA üyesi")
    : (user.name || "DOORA üyesi");

  const taskRows=tasks.map((x:any)=>({...x,created_at:String(x.created_at),work_started_at:x.work_started_at?String(x.work_started_at):null,completion_requested_at:x.completion_requested_at?String(x.completion_requested_at):null}));
  const receivedRows=received.map((x:any)=>({...x,created_at:String(x.created_at),bidder:x.bidder==null?null:String(x.bidder)}));
  const sentOfferRows=sentOffers.map((x:any)=>({...x,created_at:String(x.created_at),bidder:x.bidder==null?null:String(x.bidder)}));

  return (
    <main className="doora-page doora-account-page">
      <header className="doora-app-header">
        <Link className="doora-brand" href="/"><span className="doora-brand-mark">d</span><span>doora<span>.</span></span></Link>
        <div className="doora-header-right"><Link href="/isler" className="header-discover">İşleri keşfet <ArrowUpRight size={15}/></Link><div className="header-logout"><LogoutButton/></div></div>
      </header>
      <div className="doora-page-container account-page-container">
        <div className="wallet-lite-page-title"><h1>Hesabım</h1><span>DOORA</span><NotificationCenter/><AccountSettings name={accountName} email={user.email || ""} userId={user.id}/></div>
        <AccountDashboard name={accountName} email={user.email || ""} walletInitialData={walletInitialData} walletInitialError={walletInitialError} tasks={taskRows} assigned={assigned.map((x:any)=>({...x,created_at:String(x.created_at),work_started_at:x.work_started_at?String(x.work_started_at):null,completion_requested_at:x.completion_requested_at?String(x.completion_requested_at):null}))} received={receivedRows} sentOffers={sentOfferRows} taskCount={Number(taskTotal[0]?.count ?? 0)} receivedCount={Number(receivedTotal[0]?.count ?? 0)} pendingOfferCount={Number(pendingOffers[0]?.count ?? 0)}/>
        <div className="account-page-footer"><span>DOORA · Günlük işler, kolay çözümler.</span><Link href="/kaydedilenler">Kaydedilen işlerin <ArrowUpRight size={14}/></Link></div>
      </div>
      <AppBottomNav active="account" pendingOffers={Number(pendingOffers[0]?.count ?? 0)}/>
    </main>
  );
}
