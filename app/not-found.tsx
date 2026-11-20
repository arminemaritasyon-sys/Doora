import Link from "next/link";
import { ArrowLeft, Compass, Search } from "lucide-react";

export default function NotFound() {
  return <main className="doora-not-found">
    <div className="not-found-glow not-found-glow-a"/><div className="not-found-glow not-found-glow-b"/>
    <header className="not-found-header"><Link className="doora-brand" href="/"><span className="doora-brand-mark">d</span><span>doora<span>.</span></span></Link><span>GÜNLÜK İŞLER, KOLAY ÇÖZÜMLER.</span></header>
    <section className="not-found-content">
      <div className="not-found-visual"><span className="not-found-orbit orbit-one"/><span className="not-found-orbit orbit-two"/><div className="not-found-symbol">d<span>.</span></div><span className="not-found-spark spark-one"/><span className="not-found-spark spark-two"/></div>
      <span className="not-found-kicker">BİR ŞEYLER YOLUNDA DEĞİL</span>
      <h1>Bu sayfa<br/><em>işler arasında yok.</em></h1>
      <p>Aradığın sayfa taşınmış, kaldırılmış ya da bağlantı yanlış yazılmış olabilir. Merak etme, DOORA'da keşfedecek başka işler var.</p>
      <div className="not-found-actions"><Link className="not-found-primary" href="/isler"><Compass size={17}/> İşleri keşfet</Link><Link className="not-found-secondary" href="/"><ArrowLeft size={16}/> Ana sayfaya dön</Link></div>
      <span className="not-found-code"><Search size={13}/> 404 · SAYFA BULUNAMADI</span>
    </section>
    <footer className="not-found-footer"><span>DOORA</span><span>Her işin bir çözümü var.</span></footer>
  </main>;
}
