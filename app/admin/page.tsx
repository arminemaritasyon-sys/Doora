import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Activity, ArrowDownLeft, ArrowUpRight, BadgeCheck, BriefcaseBusiness,
  CircleAlert, ClipboardList, LayoutDashboard, LifeBuoy, ShieldCheck,
  Users, Wallet, Clock3, ExternalLink
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import { isDooraAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const number = (value: unknown) => new Intl.NumberFormat("tr-TR").format(Number(value || 0));
const money = (value: unknown) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Number(value || 0)) + " ₺";
const date = (value: unknown) => value ? new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(String(value))) : "—";

async function safeCount(query: Promise<any>) {
  try { const rows = await query; return Number(rows?.[0]?.count || 0); }
  catch { return null; }
}

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?next=%2Fadmin");
  if (!isDooraAdmin(user)) notFound();

  const [users, tasks, openTasks, offers, pendingOffers, reports, withdrawals, recentTasks, recentUsers] = await Promise.all([
    safeCount(db`SELECT count(*)::int AS count FROM public.user_profiles`),
    safeCount(db`SELECT count(*)::int AS count FROM public.tasks`),
    safeCount(db`SELECT count(*)::int AS count FROM public.tasks WHERE status='open'`),
    safeCount(db`SELECT count(*)::int AS count FROM public.offers`),
    safeCount(db`SELECT count(*)::int AS count FROM public.offers WHERE status='pending'`),
    safeCount(db`SELECT count(*)::int AS count FROM public.user_reports WHERE status='open'`),
    safeCount(db`SELECT count(*)::int AS count FROM public.wallet_withdrawals WHERE status IN ('pending','requested')`),
    db`SELECT t.id,t.title,t.category,t.district,t.budget,t.status,t.created_at,
      COALESCE(NULLIF(p.display_name,''),'DOORA üyesi') AS owner_name
      FROM public.tasks t LEFT JOIN public.user_profiles p ON p.user_id=t.owner_id
      ORDER BY t.created_at DESC LIMIT 7`.catch((error) => { console.error("[admin] recent tasks failed", error); return []; }),
    db`SELECT user_id,COALESCE(NULLIF(display_name,''),'DOORA üyesi') AS display_name,district,created_at
      FROM public.user_profiles ORDER BY created_at DESC LIMIT 6`.catch((error) => { console.error("[admin] recent users failed", error); return []; })
  ]);

  const metrics = [
    { label: "Toplam kullanıcı", value: users, icon: Users, note: "Profil kaydı bulunan üyeler" },
    { label: "Toplam ilan", value: tasks, icon: ClipboardList, note: "Açılan tüm ilanlar" },
    { label: "Yayındaki ilan", value: openTasks, icon: BriefcaseBusiness, note: "Teklif kabul eden ilanlar" },
    { label: "Toplam teklif", value: offers, icon: Activity, note: "Gönderilen teklifler" }
  ];

  return <main className="doora-admin">
    <aside className="doora-admin-sidebar">
      <Link href="/" className="doora-admin-brand"><span className="doora-admin-mark">d</span><span>doora<span>.</span><small>YÖNETİM</small></span></Link>
      <div className="doora-admin-nav-label">MENÜ</div>
      <Link className="doora-admin-nav active" href="/admin"><LayoutDashboard size={18}/> Genel bakış</Link>
      <a className="doora-admin-nav" href="#ilanlar"><ClipboardList size={18}/> Son ilanlar</a>
      <a className="doora-admin-nav" href="#uyeler"><Users size={18}/> Yeni üyeler</a>
      <a className="doora-admin-nav" href="#takip"><LifeBuoy size={18}/> Takip edilmesi gerekenler</a>
      <div className="doora-admin-sidebar-bottom"><ShieldCheck size={17}/><span>Güvenli yönetici alanı</span></div>
    </aside>

    <section className="doora-admin-main">
      <header className="doora-admin-topbar">
        <div><span className="doora-admin-eyebrow">DOORA / YÖNETİM</span><h1>Genel bakış</h1></div>
        <div className="doora-admin-user"><span className="doora-admin-avatar">{String(user.name || user.email).slice(0,1).toLocaleUpperCase("tr")}</span><span><b>{user.name || "Yönetici"}</b><small>Yönetici hesabı</small></span><Link href="/" aria-label="Siteye git"><ExternalLink size={17}/></Link></div>
      </header>

      <div className="doora-admin-welcome"><div><span>YÖNETİM MERKEZİ</span><h2>Merhaba, {user.name || "Yönetici"} 👋</h2><p>DOORA'daki gelişmeleri ve dikkat gerektiren işlemleri buradan takip edebilirsin.</p></div><div className="doora-admin-date"><Clock3 size={16}/>{new Intl.DateTimeFormat("tr-TR",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}</div></div>

      <div className="doora-admin-metrics">{metrics.map((item) => <article className="doora-admin-metric" key={item.label}><div className="doora-admin-metric-top"><span>{item.label}</span><i><item.icon size={19}/></i></div><strong>{item.value === null ? "—" : number(item.value)}</strong><small>{item.note}</small></article>)}</div>

      <section className="doora-admin-section" id="takip"><div className="doora-admin-section-head"><div><span>OPERASYON</span><h2>Takip edilmesi gerekenler</h2></div></div>
        <div className="doora-admin-alert-grid">
          <article className="doora-admin-alert"><div className="doora-admin-alert-icon amber"><CircleAlert size={19}/></div><div><b>{pendingOffers === null ? "—" : number(pendingOffers)}</b><span>Yanıt bekleyen teklif</span></div><small>Teklifler</small></article>
          <article className="doora-admin-alert"><div className="doora-admin-alert-icon red"><LifeBuoy size={19}/></div><div><b>{reports === null ? "—" : number(reports)}</b><span>Açık kullanıcı bildirimi</span></div><small>Şikâyetler</small></article>
          <article className="doora-admin-alert"><div className="doora-admin-alert-icon blue"><ArrowDownLeft size={19}/></div><div><b>{withdrawals === null ? "—" : number(withdrawals)}</b><span>Bekleyen para çekme</span></div><small>Cüzdan</small></article>
        </div>
        <p className="doora-admin-footnote">Bazı sayılar ilgili veritabanı tablosu henüz hazır değilse “—” olarak görünür.</p>
      </section>

      <div className="doora-admin-lower">
        <section className="doora-admin-panel" id="ilanlar"><div className="doora-admin-section-head"><div><span>PAZARYERİ</span><h2>Son ilanlar</h2></div><Link href="/isler">Siteyi görüntüle <ArrowUpRight size={15}/></Link></div>
          <div className="doora-admin-table-wrap"><table className="doora-admin-table"><thead><tr><th>İLAN</th><th>İLAN SAHİBİ</th><th>BÜTÇE</th><th>DURUM</th></tr></thead><tbody>
            {recentTasks.length ? recentTasks.map((task:any)=><tr key={task.id}><td><b>{task.title}</b><small>{task.category} · {task.district}</small></td><td>{task.owner_name}</td><td>{money(task.budget)}</td><td><span className={"doora-admin-status "+task.status}>{task.status==="open"?"Yayında":task.status==="paused"?"Pasif":task.status==="assigned"?"Atandı":task.status==="completed"?"Tamamlandı":task.status==="disputed"?"İncelemede":"İptal"}</span></td></tr>) : <tr><td colSpan={4} className="doora-admin-empty">Henüz ilan bulunmuyor.</td></tr>}
          </tbody></table></div>
        </section>

        <section className="doora-admin-panel" id="uyeler"><div className="doora-admin-section-head"><div><span>TOPLULUK</span><h2>Yeni üyeler</h2></div><span className="doora-admin-count">{recentUsers.length} kayıt</span></div>
          <div className="doora-admin-member-list">{recentUsers.length ? recentUsers.map((member:any)=><div className="doora-admin-member" key={member.user_id}><span className="doora-admin-member-avatar">{String(member.display_name||"D").slice(0,1).toLocaleUpperCase("tr")}</span><div><b>{member.display_name}</b><small>{member.district || "Konum eklenmemiş"}</small></div><time>{date(member.created_at)}</time></div>) : <div className="doora-admin-empty">Henüz üye kaydı bulunmuyor.</div>}</div>
        </section>
      </div>
      <footer className="doora-admin-footer"><span>DOORA Yönetim Paneli</span><span><BadgeCheck size={14}/> Yetkili oturum</span></footer>
    </section>
  </main>;
}
