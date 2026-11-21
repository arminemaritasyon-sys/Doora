import Link from "next/link";
import { ArrowLeft, MapPin, ShieldCheck, Star, BriefcaseBusiness } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let rows:any[] = [];
  try {
    rows = await db`
      SELECT p.user_id,p.display_name,p.avatar_url,p.district,p.bio,p.is_verified,
        COALESCE(rv.rating,0)::numeric AS rating,COALESCE(rv.review_count,0)::int AS review_count,
        COALESCE(done.completed_count,0)::int AS completed_count
      FROM public.user_profiles p
      LEFT JOIN LATERAL (SELECT avg(rating) AS rating,count(*) AS review_count FROM public.task_reviews WHERE reviewee_id=p.user_id) rv ON true
      LEFT JOIN LATERAL (SELECT count(*) AS completed_count FROM public.tasks t JOIN public.offers o ON o.id=t.assigned_offer_id WHERE o.user_id=p.user_id AND t.status='completed') done ON true
      WHERE p.user_id=${id} LIMIT 1
    `;
  } catch { notFound(); }
  const profile=rows[0];
  if(!profile) notFound();
  const portfolio=await db`
    SELECT id,title,description,image_data AS "imageData"
    FROM public.service_portfolio_items WHERE user_id=${id}
    ORDER BY created_at DESC LIMIT 24
  `;
  return <main className="provider-page">
    <header className="provider-topbar"><Link href="/isler"><ArrowLeft size={17}/> İşlere dön</Link><Link href="/" className="provider-brand">doora<span>.</span></Link></header>
    <div className="provider-content">
      <section className="provider-hero">
        <div className="provider-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt="" />:String(profile.display_name||"D").slice(0,1).toLocaleUpperCase("tr")}</div>
        <div className="provider-identity"><div className="provider-name-row"><h1>{profile.display_name||"DOORA üyesi"}</h1>{profile.is_verified?<span className="provider-verified"><ShieldCheck size={14}/> Doğrulanmış</span>:null}</div>
          <span className="provider-location"><MapPin size={15}/>{profile.district||"Konum belirtilmemiş"}</span>
          <div className="provider-stats"><span><Star size={15} fill="currentColor"/> {Number(profile.rating).toFixed(1)} ({profile.review_count} değerlendirme)</span><span><BriefcaseBusiness size={15}/>{profile.completed_count} tamamlanan iş</span></div>
        </div>
      </section>
      {profile.bio?<section className="provider-about"><h2>Hakkında</h2><p>{profile.bio}</p></section>:null}
      <section className="provider-portfolio"><div className="provider-section-head"><div><small>HİZMET VEREN</small><h2>Çalışmalarım</h2></div><span>{portfolio.length} çalışma</span></div>
        {portfolio.length?<div className="provider-portfolio-grid">{portfolio.map((item:any)=><article className="provider-work" key={item.id}><img src={item.imageData} alt={item.title} loading="lazy"/><div><b>{item.title}</b>{item.description?<p>{item.description}</p>:null}</div></article>)}</div>:<div className="provider-empty">Bu kullanıcı henüz portföyüne çalışma eklememiş.</div>}
      </section>
    </div>
  </main>;
}
