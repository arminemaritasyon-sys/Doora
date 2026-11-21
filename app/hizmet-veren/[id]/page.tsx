import Link from "next/link";
import { ArrowLeft, MapPin, BriefcaseBusiness } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let profile:any = null;
  try {
    const rows = await db`
      SELECT user_id,display_name,avatar_url,district,bio
      FROM public.user_profiles
      WHERE user_id=${id}
      LIMIT 1
    `;
    profile = rows[0] || null;
  } catch {
    profile = null;
  }
  // Bazı kullanıcıların henüz user_profiles kaydı olmayabilir; profil bağlantısı yine de açılmalı.
  if(!profile) profile = { user_id: id, display_name: "DOORA üyesi", avatar_url: null, district: null, bio: null };

  // İstatistik ve portföy tabloları henüz veritabanına eklenmemiş olsa da
  // temel hizmet veren profili açılmaya devam etsin.
  let portfolio:any[] = [];
  try {
    portfolio = await db`
      SELECT id,title,description,image_data AS "imageData"
      FROM public.service_portfolio_items
      WHERE user_id=${id}
      ORDER BY created_at DESC
      LIMIT 24
    `;
  } catch {
    portfolio = [];
  }
  return <main className="provider-page">
    <header className="provider-topbar"><Link href="/isler"><ArrowLeft size={17}/> İşlere dön</Link><Link href="/" className="provider-brand">doora<span>.</span></Link></header>
    <div className="provider-content">
      <section className="provider-hero">
        <div className="provider-avatar">{profile.avatar_url?<img src={profile.avatar_url} alt="" />:String(profile.display_name||"D").slice(0,1).toLocaleUpperCase("tr")}</div>
        <div className="provider-identity"><div className="provider-name-row"><h1>{profile.display_name||"DOORA üyesi"}</h1></div>
          <span className="provider-location"><MapPin size={15}/>{profile.district||"Konum belirtilmemiş"}</span>
          <div className="provider-stats"><span><BriefcaseBusiness size={15}/>DOORA hizmet veren profili</span></div>
        </div>
      </section>
      {profile.bio?<section className="provider-about"><h2>Hakkında</h2><p>{profile.bio}</p></section>:null}
      <section className="provider-portfolio"><div className="provider-section-head"><div><small>HİZMET VEREN</small><h2>Çalışmalarım</h2></div><span>{portfolio.length} çalışma</span></div>
        {portfolio.length?<div className="provider-portfolio-grid">{portfolio.map((item:any)=><article className="provider-work" key={item.id}><img src={item.imageData} alt={item.title} loading="lazy"/><div><b>{item.title}</b>{item.description?<p>{item.description}</p>:null}</div></article>)}</div>:<div className="provider-empty">Bu kullanıcı henüz portföyüne çalışma eklememiş.</div>}
      </section>
    </div>
  </main>;
}
