"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import {
  ArrowUpRight, Bookmark, BookmarkCheck, CalendarDays, Check, Clock3,
  Home, MapPin, Package, Search, ShoppingBag, Truck, Wrench, X, BriefcaseBusiness
} from "lucide-react";

export type SavedTask = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  budget: string | number;
  district: string | null;
  created_at: string;
};

const money = (value: string | number) => new Intl.NumberFormat("tr-TR").format(Number(value)) + " ₺";
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tarih bilgisi yok" : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date);
};
const categoryIcon = (category: string | null) => {
  const value = (category || "").toLocaleLowerCase("tr");
  if (value.includes("alış")) return ShoppingBag;
  if (value.includes("teslim")) return Package;
  if (value.includes("taşı")) return Truck;
  if (value.includes("tamir")) return Wrench;
  if (value.includes("ev")) return Home;
  return BriefcaseBusiness;
};

export default function SavedExplorer({ initialTasks }: { initialTasks: SavedTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tümü");
  const [sort, setSort] = useState("newest");
  const [removing, setRemoving] = useState<string[]>([]);
  const categories = useMemo(() => ["Tümü", ...Array.from(new Set(tasks.map(t => t.category || "Diğer")))], [tasks]);
  const visible = useMemo(() => tasks
    .filter(t => category === "Tümü" || (t.category || "Diğer") === category)
    .filter(t => (t.title + " " + (t.description || "") + " " + (t.district || "")).toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")))
    .sort((a,b) => sort === "low" ? Number(a.budget)-Number(b.budget) : sort === "high" ? Number(b.budget)-Number(a.budget) : new Date(b.created_at).getTime()-new Date(a.created_at).getTime()), [tasks, category, query, sort]);

  async function remove(id: string) {
    setRemoving(v => [...v, id]);
    try {
      const response = await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: id }) });
      const result = await response.json();
      if (!response.ok || result.saved !== false) throw new Error(result.error || "Kayıttan çıkarılamadı.");
      setTasks(v => v.filter(task => task.id !== id));
      toast.success("İş kaydedilenlerden çıkarıldı.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setRemoving(v => v.filter(item => item !== id));
    }
  }

  return (
    <div className="saved-explorer">
      <div className="saved-toolbar">
        <label className="saved-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kaydettiğin işlerde ara..." aria-label="Kaydedilenlerde ara"/>{query && <button type="button" onClick={()=>setQuery("")} aria-label="Aramayı temizle"><X size={16}/></button>}</label>
        <label className="saved-sort"><span>Sırala</span><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sıralama"><option value="newest">En yeni</option><option value="low">Bütçe: düşük</option><option value="high">Bütçe: yüksek</option></select></label>
      </div>
      {tasks.length > 0 && <Tabs.Root value={category} onValueChange={setCategory} className="saved-tabs">
        <Tabs.List className="saved-tabs-list" aria-label="Kategori filtresi">
          {categories.map(item => <Tabs.Trigger key={item} value={item} className="saved-tab">{item}{item === "Tümü" && <span>{tasks.length}</span>}</Tabs.Trigger>)}
        </Tabs.List>
      </Tabs.Root>}
      {tasks.length === 0 ? <motion.section className="saved-zero" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
        <div className="saved-zero-art"><span/><BookmarkCheck size={34}/></div>
        <span className="saved-overline">KİŞİSEL LİSTEN</span><h2>İlk favori işini keşfet.</h2>
        <p>İlgini çeken ilanları kaydet. Karar vermeye hazır olduğunda hepsi burada seni bekler.</p>
        <a className="saved-primary-action" href="/isler">İşleri keşfet <ArrowUpRight size={17}/></a>
      </motion.section> : visible.length === 0 ? <div className="saved-no-results"><Search size={20}/><strong>Aramana uygun kayıt bulamadık.</strong><span>Farklı bir kelime ya da kategori deneyebilirsin.</span><button onClick={()=>{setQuery("");setCategory("Tümü")}}>Filtreleri temizle</button></div> :
      <motion.div layout className="saved-cards">
        <AnimatePresence mode="popLayout">
          {visible.map((task,index) => {
            const Icon = categoryIcon(task.category);
            return <motion.article className="saved-item" key={task.id} layout initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.97}} transition={{duration:.22,delay:Math.min(index*.035,.16)}}>
              <div className="saved-item-top">
                <div className="saved-item-symbol"><Icon size={21} strokeWidth={1.8}/></div>
                <div className="saved-item-labels"><span>{task.category || "Diğer"}</span><small><Check size={12}/> Kaydedildi</small></div>
                <button className="saved-remove" type="button" onClick={()=>remove(task.id)} disabled={removing.includes(task.id)} aria-label="Kaydedilenlerden çıkar">{removing.includes(task.id) ? <span className="saved-spinner"/> : <X size={17}/>}</button>
              </div>
              <h2>{task.title}</h2>
              <p className="saved-item-description">{task.description || "Bu ilan için henüz açıklama eklenmemiş."}</p>
              <div className="saved-item-details">
                {task.district && <span><MapPin size={14}/>{task.district}</span>}
                <span><CalendarDays size={14}/>{dateLabel(task.created_at)}</span>
              </div>
              <div className="saved-item-footer"><div><small>İlan bütçesi</small><strong>{money(task.budget)}</strong></div><a href="/isler">İlanı incele <ArrowUpRight size={16}/></a></div>
            </motion.article>
          })}
        </AnimatePresence>
      </motion.div>}
      <div className="saved-footnote"><Bookmark size={14}/> Kaydettiğin ilanlar yalnızca senin hesabında görünür.</div>
    </div>
  );
}
