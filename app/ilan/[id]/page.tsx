import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, MapPin, CalendarDays, Tag, Wallet, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";
import TaskSafetyActions from "./task-safety-actions";
import TaskDetailOffer from "./task-detail-offer";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let task:any;
  try {
    const rows = await db`
      SELECT t.id,t.owner_id,t.title,t.description,t.category,t.budget,t.city,t.district,t.status,t.created_at,t.scheduled_at,
        COALESCE(NULLIF(p.display_name,''),'DOORA üyesi') AS owner_name,
        CASE WHEN p.avatar_url IS NOT NULL THEN '/api/profile/avatar?userId=' || p.user_id || '&v=' || floor(extract(epoch from p.updated_at)*1000)::bigint::text END AS avatar_url
      FROM public.tasks t
      LEFT JOIN public.user_profiles p ON p.user_id=t.owner_id
      WHERE t.id=${id}::uuid
      LIMIT 1
    `;
    task=rows[0];
  } catch { notFound(); }
  if(!task) notFound();
  const user=await getCurrentUser();
  const isOwner=user?.id===String(task.owner_id);
  const date=new Intl.DateTimeFormat("tr-TR",{day:"numeric",month:"long",year:"numeric"}).format(new Date(task.created_at));
  const statusLabel:Record<string,string>={open:"Tekliflere açık",paused:"Geçici olarak pasif",assigned:"İş başladı",completed:"Tamamlandı",cancelled:"İptal edildi",disputed:"İncelemede"};
  return <main className="doora-page doora-task-detail-page">
    <header className="doora-app-header">
      <Link className="doora-brand" href="/"><span className="doora-brand-mark">d</span><span>doora<span>.</span></span></Link>
      <div className="doora-header-right"><Link href="/isler" className="header-discover"><ArrowLeft size={15}/> İşlere dön</Link>{user?<Link href="/hesabim" className="header-logout account-logout">Hesabım</Link>:<Link href={`/giris?next=${encodeURIComponent(`/ilan/${task.id}`)}`} className="header-logout account-logout">Giriş yap</Link>}</div>
    </header>
    <div className="task-detail-wrap">
      <div className="task-detail-breadcrumb"><Link href="/isler">İşleri keşfet</Link><span>/</span><span>İlan detayı</span></div>
      <article className="task-detail-card">
        <div className="task-detail-top"><span className="task-detail-category"><Tag size={14}/>{task.category||"Genel"}</span><span className={"task-detail-status "+task.status}>{statusLabel[task.status]||"İlan"}</span></div>
        <h1>{task.title}</h1>
        <div className="task-detail-meta"><span><MapPin size={16}/>{task.district||task.city||"Konum belirtilmemiş"}</span><span><CalendarDays size={16}/>{date}</span></div>
        <div className="task-detail-description">{task.description}</div>
        <div className="task-detail-bottom"><div><small>İŞ BÜTÇESİ</small><strong>{new Intl.NumberFormat("tr-TR",{maximumFractionDigits:2}).format(Number(task.budget))} ₺</strong></div><span><ShieldCheck size={16}/> DOORA güvencesiyle</span></div>
        <div className="task-detail-owner"><span className="task-detail-avatar">{task.avatar_url?<img src={task.avatar_url} alt="" loading="lazy" decoding="async"/>:String(task.owner_name||"D").slice(0,1).toLocaleUpperCase("tr")}</span><div><small>İLAN SAHİBİ</small><b>{task.owner_name}</b><Link href={"/hizmet-veren/"+task.owner_id} className="provider-profile-link">Profili görüntüle</Link></div></div>
        {isOwner?<Link className="task-detail-primary" href="/hesabim">İlanını hesabından yönet <ArrowUpRight size={17}/></Link>:task.status==="open"?user?<TaskDetailOffer taskId={String(task.id)} taskTitle={String(task.title)}/>:<Link className="task-detail-primary" href={`/giris?next=${encodeURIComponent(`/ilan/${task.id}`)}`}>Giriş yap ve Ben yaparım <ArrowUpRight size={17}/></Link>:<p className="task-detail-closed">Bu ilan şu anda yeni teklif kabul etmiyor.</p>}{user&&!isOwner?<TaskSafetyActions taskId={String(task.id)} ownerId={String(task.owner_id)}/>:null}
      </article>
      <Link className="task-detail-back" href="/isler"><ArrowLeft size={15}/> Diğer işleri keşfet</Link>
    </div>
  </main>;
}
