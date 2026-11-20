"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, Bell, Bookmark, Check,
  CheckCircle2, ChevronDown, Clock3, Compass, Filter, Heart, HelpCircle,
  ImagePlus, LogIn, MapPin, Menu, MessageCircle, MoreHorizontal, Plus,
  Search, Send, ShieldCheck, SlidersHorizontal, Sparkles, Star, UserRound,
  Wallet, X, Zap, BriefcaseBusiness, CalendarDays, CircleUserRound,
  ListFilter, LoaderCircle, Mail, LockKeyhole, Camera, Trash2, CircleHelp
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  scheduledAt: string | null;
  createdAt: string;
  ownerId?: string;
  ownerName: string;
  ownerInitials: string;
  status: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
  offersCount: number;
  imageUrl?: string | null;
  isDemo?: boolean;
};
type Offer = { id: string; taskId: string; amount: number; message: string; createdAt: string; status: string };
type Tab = "discover" | "my-tasks" | "saved" | "messages" | "profile";

const categories = [
  { name: "Tümü", icon: Compass, count: "Keşfet" },
  { name: "Alışveriş", icon: BriefcaseBusiness, count: "Alışveriş" },
  { name: "Teslimat", icon: Zap, count: "Teslimat" },
  { name: "Ev işleri", icon: ShieldCheck, count: "Ev işleri" },
  { name: "Taşıma", icon: ArrowDownUp, count: "Taşıma" },
  { name: "Tamir", icon: SlidersHorizontal, count: "Tamir" },
  { name: "Diğer", icon: Sparkles, count: "Diğer" },
];

const demoTasks: Task[] = [
  { id: "demo-1", title: "Market alışverişimi yapabilir misin?", description: "Listeyi ve market kartını paylaşacağım. Ürünleri alıp kapıma bırakmanı rica ediyorum.", category: "Alışveriş", budget: 250, location: "Muratpaşa, Antalya", scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), ownerName: "Ece A.", ownerInitials: "EA", status: "open", offersCount: 4, isDemo: true },
  { id: "demo-2", title: "Koltukları taşımama yardım et", description: "İki kat aşağıya indirilecek. İki kişi olursak yaklaşık yarım saat sürer.", category: "Taşıma", budget: 400, location: "Konyaaltı, Antalya", scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(), createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), ownerName: "Mert K.", ownerInitials: "MK", status: "open", offersCount: 2, isDemo: true },
  { id: "demo-3", title: "Kedime akşam mama verir misin?", description: "Evime uğrayıp mamasını ve suyunu tazelemen yeterli. Çok uysal bir kedidir.", category: "Ev işleri", budget: 150, location: "Lara, Antalya", scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(), createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), ownerName: "Selin Y.", ownerInitials: "SY", status: "open", offersCount: 6, isDemo: true },
  { id: "demo-4", title: "Kargomu şubeden teslim al", description: "Şubeden teslim alınması gereken küçük bir paketim var. Teslim kodunu paylaşacağım.", category: "Teslimat", budget: 180, location: "Kepez, Antalya", scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(), ownerName: "Ali D.", ownerInitials: "AD", status: "open", offersCount: 3, isDemo: true },
  { id: "demo-5", title: "Balkon kapısının kolunu sık", description: "Kapı kolu gevşedi. Uygun bir tornavida ile sıkılması gerekiyor.", category: "Tamir", budget: 220, location: "Şirinyalı, Antalya", scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 30).toISOString(), createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(), ownerName: "Can T.", ownerInitials: "CT", status: "open", offersCount: 1, isDemo: true },
  { id: "demo-6", title: "Bitkilerimi sulamaya uğra", description: "Hafta sonu şehir dışında olacağım. Salondaki ve balkondaki bitkileri sulaman yeterli.", category: "Ev işleri", budget: 200, location: "Fener, Antalya", scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), createdAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(), ownerName: "Duru S.", ownerInitials: "DS", status: "open", offersCount: 5, isDemo: true },
];

const money = (value: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value) + " ₺";
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase("tr") || "").join("") || "D";
const formatDate = (value: string | null) => {
  if (!value) return "Zaman esnek";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Zaman belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
};
const relativeDate = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return minutes + " dk önce";
  if (minutes < 1440) return Math.floor(minutes / 60) + " saat önce";
  return Math.floor(minutes / 1440) + " gün önce";
};

const taskSchema = z.object({
  title: z.string().trim().min(5, "Başlık en az 5 karakter olmalı.").max(90, "Başlık en fazla 90 karakter olabilir."),
  category: z.string().min(1, "Bir kategori seç."),
  description: z.string().trim().min(15, "İşi biraz daha detaylı anlat.").max(2000),
  budget: z.coerce.number().int().positive("Ücret sıfırdan büyük olmalı.").max(10000000),
  location: z.string().trim().min(3, "Konum bilgisi gerekli."),
  scheduledAt: z.string().optional(),
});
const offerSchema = z.object({
  amount: z.coerce.number().int().positive("Teklif tutarı geçerli olmalı."),
  message: z.string().trim().min(10, "Kendini biraz daha anlat.").max(800),
});

function Brand() {
  return <a className="brand" href="#top" aria-label="DOORA ana sayfa"><span className="brand-symbol">d</span><span>doora<span className="brand-period">.</span></span></a>;
}

function Avatar({ name, size = "normal" }: { name: string; size?: "normal" | "large" }) {
  return <span className={"avatar " + size}>{initials(name)}</span>;
}

function TaskCard({ task, saved, onSave, onOpen, onOffer }: {
  task: Task; saved: boolean; onSave: (id: string) => void; onOpen: (task: Task) => void; onOffer: (task: Task) => void;
}) {
  return (
    <article className="task-card">
      <button className={"save-button " + (saved ? "is-saved" : "")} onClick={() => onSave(task.id)} aria-label={saved ? "Kaydedilenlerden çıkar" : "İşi kaydet"}>
        <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
      </button>
      {task.imageUrl ? <button className="task-image" onClick={() => onOpen(task)}><img src={task.imageUrl} alt="" /></button> : null}
      <div className="task-card-top">
        <span className="category-tag">{task.category}</span>
        {task.isDemo ? <span className="sample-tag">Örnek ilan</span> : <span className="posted-at">{relativeDate(task.createdAt)}</span>}
      </div>
      <button className="task-title-button" onClick={() => onOpen(task)}><h3>{task.title}</h3></button>
      <p className="task-description">{task.description}</p>
      <div className="task-meta-list">
        <span><MapPin size={14} />{task.location}</span>
        <span><CalendarDays size={14} />{formatDate(task.scheduledAt)}</span>
      </div>
      <div className="task-card-divider" />
      <div className="task-owner-row">
        <div className="owner-mini"><Avatar name={task.ownerName} /><span><b>{task.ownerName}</b><small><Star size={11} fill="currentColor" /> Yeni üye</small></span></div>
        <div className="task-budget"><strong>{money(task.budget)}</strong><small>{task.offersCount} teklif</small></div>
      </div>
      <div className="task-card-actions">
        <button className="button button-soft" onClick={() => onOpen(task)}>Detaylar</button>
        <button className="button button-dark" onClick={() => onOffer(task)}>Teklif ver <ArrowUpRight size={15} /></button>
      </div>
    </article>
  );
}

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [category, setCategory] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("Tüm Antalya");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [maxBudget, setMaxBudget] = useState("10000");
  const [createOpen, setCreateOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [offerTask, setOfferTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [user, setUser] = useState<{ id: string; email?: string; name: string } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", category: "Alışveriş", description: "", budget: "", location: "Muratpaşa, Antalya", scheduledAt: "" });
  const [offerForm, setOfferForm] = useState({ amount: "", message: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const demoMode = !isSupabaseConfigured();

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem("doora:tasks:v2");
      const storedSaved = localStorage.getItem("doora:saved:v2");
      const storedOffers = localStorage.getItem("doora:offers:v2");
      const storedMine = localStorage.getItem("doora:mine:v2");
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      if (storedSaved) setSavedIds(JSON.parse(storedSaved));
      if (storedOffers) setMyOffers(JSON.parse(storedOffers));
      if (storedMine) setMyTasks(JSON.parse(storedMine));
    } catch { /* Ignore corrupted local demo cache and use fresh demo data. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      setUser({ id: data.user.id, email: data.user.email, name: data.user.user_metadata?.display_name || data.user.email?.split("@")[0] || "DOORA üyesi" });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (session?.user) setUser({ id: session.user.id, email: session.user.email, name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "DOORA üyesi" });
      else setUser(null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  const loadRemoteTasks = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("tasks").select("id,title,description,category,budget,location_text,scheduled_at,created_at,owner_id,status,image_url").eq("status", "open").order("created_at", { ascending: false }).limit(60);
    if (error) { console.error(error); return; }
    const mapped: Task[] = (data || []).map((row: any) => ({
      id: row.id, title: row.title, description: row.description, category: row.category, budget: row.budget,
      location: row.location_text, scheduledAt: row.scheduled_at, createdAt: row.created_at, ownerId: row.owner_id,
      ownerName: "DOORA üyesi", ownerInitials: "D",
      status: row.status, offersCount: 0, imageUrl: row.image_url, isDemo: false,
    }));
    setTasks(mapped);
  }, [supabase]);

  useEffect(() => { if (supabase) loadRemoteTasks(); }, [user, supabase, loadRemoteTasks]);

  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    const loadAccountData = async () => {
      const [owned, favorites, sentOffers] = await Promise.all([
        supabase.from("tasks").select("id,title,description,category,budget,location_text,scheduled_at,created_at,owner_id,status,image_url").eq("owner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("favorites").select("task_id").eq("user_id", user.id),
        supabase.from("offers").select("id,task_id,amount,message,created_at,status").eq("sender_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      if (owned.data) setMyTasks(owned.data.map((row: any) => ({
        id: row.id, title: row.title, description: row.description, category: row.category, budget: row.budget,
        location: row.location_text, scheduledAt: row.scheduled_at, createdAt: row.created_at, ownerId: row.owner_id,
        ownerName: user.name, ownerInitials: initials(user.name), status: row.status, offersCount: 0,
        imageUrl: row.image_url, isDemo: false,
      })));
      if (favorites.data) setSavedIds(favorites.data.map((row: any) => row.task_id));
      if (sentOffers.data) setMyOffers(sentOffers.data.map((row: any) => ({
        id: row.id, taskId: row.task_id, amount: row.amount, message: row.message, createdAt: row.created_at, status: row.status,
      })));
    };
    loadAccountData();
    return () => { alive = false; };
  }, [supabase, user]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("doora:tasks:v2", JSON.stringify(tasks));
    localStorage.setItem("doora:saved:v2", JSON.stringify(savedIds));
    localStorage.setItem("doora:offers:v2", JSON.stringify(myOffers));
    localStorage.setItem("doora:mine:v2", JSON.stringify(myTasks));
  }, [tasks, savedIds, myOffers, myTasks, ready, demoMode]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => task.status === "open");
    if (category !== "Tümü") result = result.filter((task) => task.category === category);
    if (district !== "Tüm Antalya") result = result.filter((task) => task.location.toLocaleLowerCase("tr").includes(district.toLocaleLowerCase("tr")));
    if (query.trim()) {
      const needle = query.toLocaleLowerCase("tr");
      result = result.filter((task) => [task.title, task.description, task.location, task.category].join(" ").toLocaleLowerCase("tr").includes(needle));
    }
    result = result.filter((task) => task.budget <= Number(maxBudget || 10000000));
    return [...result].sort((a, b) => sort === "budget-low" ? a.budget - b.budget : sort === "budget-high" ? b.budget - a.budget : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, category, district, query, sort, maxBudget]);

  const toggleSave = (id: string) => {
    if (id.startsWith("demo-") || demoMode) {
      setSavedIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id]);
      toast.success(savedIds.includes(id) ? "Kaydedilenlerden çıkarıldı." : "Kaydedilenlere eklendi.");
      return;
    }
    if (!user) { setAuthOpen(true); return; }
    const exists = savedIds.includes(id);
    setSavedIds((current) => exists ? current.filter((saved) => saved !== id) : [...current, id]);
    if (exists) supabase?.from("favorites").delete().eq("task_id", id).eq("user_id", user.id);
    else supabase?.from("favorites").insert({ task_id: id, user_id: user.id });
    toast.success(exists ? "Kaydedilenlerden çıkarıldı." : "Kaydedilenlere eklendi.");
  };

  const openOffer = (task: Task) => {
    if (supabase && !user && !task.isDemo) { setAuthOpen(true); return; }
    if (task.ownerId && user?.id === task.ownerId) { toast.error("Kendi ilanına teklif veremezsin."); return; }
    setOfferForm({ amount: String(task.budget), message: "" });
    setOfferTask(task);
  };

  const submitTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (supabase && !user) {
      toast.info("İlan yayınlamak için önce giriş yapmalısın.");
      setCreateOpen(false);
      setAuthOpen(true);
      return;
    }
    const parsed = taskSchema.safeParse({ ...taskForm, budget: taskForm.budget });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || "Bilgileri kontrol et."); return; }
    setBusy(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile && supabase && user) {
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "-");
        const path = user.id + "/" + crypto.randomUUID() + "-" + safeName;
        const { error: uploadError } = await supabase.storage.from("task-images").upload(path, imageFile, { contentType: imageFile.type, upsert: false });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("task-images").getPublicUrl(path).data.publicUrl;
      }
      if (supabase && user) {
        const { data, error } = await supabase.from("tasks").insert({
          owner_id: user.id, title: parsed.data.title, description: parsed.data.description, category: parsed.data.category,
          budget: parsed.data.budget, location_text: parsed.data.location, scheduled_at: parsed.data.scheduledAt || null, image_url: imageUrl,
        }).select().single();
        if (error) throw error;
        const created: Task = { id: data.id, title: data.title, description: data.description, category: data.category, budget: data.budget, location: data.location_text, scheduledAt: data.scheduled_at, createdAt: data.created_at, ownerId: user.id, ownerName: user.name, ownerInitials: initials(user.name), status: data.status, offersCount: 0, imageUrl, isDemo: false };
        setTasks((current) => [created, ...current.filter((task) => !task.isDemo)]);
        setMyTasks((current) => [created, ...current]);
      } else {
        const created: Task = { id: "local-" + crypto.randomUUID(), title: parsed.data.title, description: parsed.data.description, category: parsed.data.category, budget: parsed.data.budget, location: parsed.data.location, scheduledAt: parsed.data.scheduledAt || null, createdAt: new Date().toISOString(), ownerName: "Sen", ownerInitials: "S", status: "open", offersCount: 0, isDemo: true };
        setTasks((current) => [created, ...current]);
        setMyTasks((current) => [created, ...current]);
      }
      setTaskForm({ title: "", category: "Alışveriş", description: "", budget: "", location: "Muratpaşa, Antalya", scheduledAt: "" });
      setImageFile(null);
      setCreateOpen(false);
      setActiveTab("my-tasks");
      toast.success(demoMode ? "İlanın bu tarayıcıda kaydedildi." : "İlanın yayınlandı.");
    } catch (error: any) {
      toast.error(error.message || "İlan oluşturulamadı.");
    } finally { setBusy(false); }
  };

  const submitOffer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!offerTask) return;
    const parsed = offerSchema.safeParse({ ...offerForm, amount: offerForm.amount });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || "Teklifini kontrol et."); return; }
    setBusy(true);
    try {
      if (supabase && user && !offerTask.isDemo) {
        const { error } = await supabase.from("offers").insert({ task_id: offerTask.id, sender_id: user.id, amount: parsed.data.amount, message: parsed.data.message });
        if (error) throw error;
      } else {
        setMyOffers((current) => [{ id: "offer-" + crypto.randomUUID(), taskId: offerTask.id, amount: parsed.data.amount, message: parsed.data.message, createdAt: new Date().toISOString(), status: "pending" }, ...current]);
      }
      setTasks((current) => current.map((task) => task.id === offerTask.id ? { ...task, offersCount: task.offersCount + 1 } : task));
      toast.success(demoMode ? "Demo teklifin bu tarayıcıya kaydedildi." : "Teklifin iş sahibine iletildi.");
      setOfferTask(null);
    } catch (error: any) { toast.error(error.message || "Teklif gönderilemedi."); }
    finally { setBusy(false); }
  };

  const sendMagicLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) { toast.info("Canlı üyelik için Supabase bağlantısı henüz yapılandırılmadı."); return; }
    if (!email.includes("@")) { toast.error("Geçerli bir e-posta adresi gir."); return; }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/auth/callback", data: { display_name: displayName || email.split("@")[0] } },
    });
    setAuthBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Giriş bağlantısı e-posta adresine gönderildi.");
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setActiveTab("discover");
    toast.success("Oturum kapatıldı.");
  };

  const savedTasks = tasks.filter((task) => savedIds.includes(task.id));
  const visibleTasks = activeTab === "saved" ? savedTasks : activeTab === "my-tasks" ? myTasks : filteredTasks;
  const activeTitle = activeTab === "saved" ? "Kaydettiklerin" : activeTab === "my-tasks" ? "İşlerin" : "Yakınındaki işler";
  const activeSubtitle = activeTab === "saved" ? "Sonra değerlendirmek istediklerin burada." : activeTab === "my-tasks" ? "Yayınladığın ilanları ve tekliflerini takip et." : "Sana uygun küçük işleri keşfet, gününü kolaylaştır.";

  const navItems: { id: Tab; label: string; icon: typeof Compass }[] = [
    { id: "discover", label: "Keşfet", icon: Compass },
    { id: "my-tasks", label: "İşlerim", icon: BriefcaseBusiness },
    { id: "saved", label: "Kaydedilenler", icon: Bookmark },
    { id: "messages", label: "Mesajlar", icon: MessageCircle },
    { id: "profile", label: "Profilim", icon: UserRound },
  ];

  return (
    <main id="top" className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Ana menü">
            <button className={activeTab === "discover" ? "nav-link active" : "nav-link"} onClick={() => setActiveTab("discover")}>İşleri keşfet</button>
            <button className={activeTab === "my-tasks" ? "nav-link active" : "nav-link"} onClick={() => setActiveTab("my-tasks")}>İşlerim</button>
            <a className="nav-link" href="#how-it-works">Nasıl çalışır?</a>
          </nav>
          <div className="header-actions">
            <button className="icon-button notification-button" aria-label="Bildirimler" onClick={() => toast.info("Yeni bildirimin bulunmuyor.")}><Bell size={19}/></button>
            {user ? <button className="profile-chip" onClick={() => setActiveTab("profile")}><Avatar name={user.name}/><span>{user.name.split(" ")[0]}</span><ChevronDown size={14}/></button> : <button className="button button-light header-login" onClick={() => setAuthOpen(true)}>Giriş yap</button>}
            <button className="button button-dark header-post" onClick={() => setCreateOpen(true)}><Plus size={17}/> İş ver</button>
            <button className="icon-button mobile-menu-button" aria-label="Menüyü aç" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
          </div>
        </div>
        {menuOpen && <div className="mobile-menu-panel">{navItems.map((item) => <button key={item.id} onClick={() => { setActiveTab(item.id); setMenuOpen(false); }}><item.icon size={17}/>{item.label}</button>)}</div>}
      </header>

      {demoMode && <div className="demo-notice"><span className="demo-dot"/> Ön izleme modu <span>•</span> İlan ve teklifler bu tarayıcıda saklanır, diğer kullanıcılara açık değildir.</div>}

      {activeTab === "discover" ? (
        <>
          <section className="hero-section">
            <div className="hero-inner">
              <div className="hero-copy">
                <div className="eyebrow"><span className="eyebrow-line"/> GÜNLÜK HAYATIN KOLAY YOLU</div>
                <h1>Bir işin mi var?<br/><span>DOORA halleder.</span></h1>
                <p>Yapılacak küçük bir işin varsa paylaş. Yardım etmek isteyen doğru kişiyle kolayca buluş.</p>
                <div className="hero-buttons">
                  <button className="button button-dark button-large" onClick={() => setCreateOpen(true)}>Hemen iş ver <ArrowRight size={17}/></button>
                  <button className="button button-outline button-large" onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })}>İşleri keşfet <Compass size={17}/></button>
                </div>
                <div className="hero-proof">
                  <div className="proof-avatars"><Avatar name="Ece A."/><Avatar name="Mert K."/><Avatar name="Selin Y."/></div>
                  <div><b>Birbirine yardımcı olan insanlar.</b><span>İşini paylaş, çözüm yakında.</span></div>
                </div>
              </div>
              <div className="hero-visual" aria-label="DOORA iş kartı örneği">
                <div className="visual-grid"/>
                <div className="visual-ring ring-a"/><div className="visual-ring ring-b"/>
                <div className="visual-task-card">
                  <div className="visual-top"><span className="live-dot"/> YENİ BİR İŞ</div>
                  <div className="visual-icon"><ShoppingBagIcon/></div>
                  <h3>Market alışverişimi yap</h3>
                  <div className="visual-meta"><span><MapPin size={13}/> 1,2 km yakınında</span><span><Clock3 size={13}/> Bugün</span></div>
                  <div className="visual-bottom"><strong>250 ₺</strong><span>Teklif bekliyor</span></div>
                </div>
                <div className="visual-float float-safe"><ShieldCheck size={17}/><span>Güven odaklı deneyim</span></div>
                <div className="visual-float float-people"><div className="mini-stack"><i/><i/><i/></div><span><b>Senin çevrende</b><small>yardımcı olmaya hazır</small></span></div>
                <div className="visual-star"><Sparkles size={25}/></div>
              </div>
            </div>
          </section>

          <section className="benefit-row">
            <div className="benefit-inner">
              <div><span className="benefit-icon"><ShieldCheck/></span><span><b>Şeffaf süreç</b><small>İş ve ücret baştan belli</small></span></div>
              <div><span className="benefit-icon"><MessageCircle/></span><span><b>Teklifleri karşılaştır</b><small>Sana uygun kişiyi seç</small></span></div>
              <div><span className="benefit-icon"><Star/></span><span><b>Değerlendirmeler</b><small>Deneyimleri incele</small></span></div>
              <div><span className="benefit-icon"><Zap/></span><span><b>Kolay kullanım</b><small>Az adımda işini paylaş</small></span></div>
            </div>
          </section>
        </>
      ) : null}

      <section className={"marketplace-section " + (activeTab !== "discover" ? "standalone-market" : "")} id="discover">
        <div className="marketplace-inner">
          <div className="market-heading">
            <div>
              <div className="eyebrow">{activeTab === "discover" ? "ÇEVRENDE NELER OLUYOR?" : "KİŞİSEL ALANIN"}</div>
              <h2>{activeTitle}<span className="heading-period">.</span></h2>
              <p>{activeSubtitle}</p>
            </div>
            {activeTab === "discover" ? <button className="button button-dark" onClick={() => setCreateOpen(true)}><Plus size={16}/> İşini paylaş</button> : null}
          </div>

          {activeTab === "discover" ? (
            <>
              <div className="search-panel">
                <div className="search-field"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hangi işi arıyorsun?" aria-label="İş ara"/>{query && <button onClick={() => setQuery("")} aria-label="Aramayı temizle"><X size={15}/></button>}</div>
                <div className="search-divider"/>
                <label className="district-field"><MapPin size={18}/><select value={district} onChange={(event) => setDistrict(event.target.value)} aria-label="Bölge seç"><option>Tüm Antalya</option><option>Muratpaşa</option><option>Konyaaltı</option><option>Kepez</option><option>Aksu</option><option>Döşemealtı</option></select><ChevronDown size={14}/></label>
                <button className={"filter-trigger " + (showFilters ? "selected" : "")} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17}/><span>Filtrele</span></button>
              </div>
              {showFilters && <div className="filter-panel"><label>En yüksek ücret<select value={maxBudget} onChange={(event) => setMaxBudget(event.target.value)}><option value="10000">Sınır yok</option><option value="250">250 ₺'ye kadar</option><option value="500">500 ₺'ye kadar</option><option value="1000">1.000 ₺'ye kadar</option><option value="2500">2.500 ₺'ye kadar</option></select></label><label>Sıralama<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">En yeni</option><option value="budget-low">Ücret: düşükten yükseğe</option><option value="budget-high">Ücret: yüksekten düşüğe</option></select></label><button onClick={() => { setMaxBudget("10000"); setSort("newest"); setDistrict("Tüm Antalya"); setCategory("Tümü"); setQuery(""); }}>Filtreleri temizle</button></div>}
              <div className="category-scroller">{categories.map((item) => <button key={item.name} className={"category-pill " + (category === item.name ? "active" : "")} onClick={() => setCategory(item.name)}><item.icon size={15}/>{item.count}</button>)}</div>
            </>
          ) : null}

          {activeTab === "my-tasks" ? (
            <div className="personal-stats"><div><span>Yayınladığın işler</span><strong>{myTasks.length}</strong></div><div><span>Gelen teklifler</span><strong>{myTasks.reduce((total, task) => total + task.offersCount, 0)}</strong></div><div><span>Bekleyen tekliflerim</span><strong>{myOffers.length}</strong></div></div>
          ) : null}

          {activeTab === "saved" ? <div className="saved-intro"><Bookmark size={18}/><span>Kaydettiğin ilanları daha sonra buradan kolayca bulabilirsin.</span></div> : null}

          {activeTab === "messages" ? (
            <div className="empty-state large-empty"><span className="empty-icon"><MessageCircle size={25}/></span><h3>Konuşmaların burada olacak</h3><p>Bir iş için teklif gönderdiğinde veya teklifin kabul edildiğinde iş sahibiyle iletişim kurabileceğin alan burada görünecek.</p><button className="button button-dark" onClick={() => setActiveTab("discover")}>İşleri keşfet <ArrowRight size={16}/></button></div>
          ) : null}

          {activeTab === "profile" ? (
            <div className="profile-panel">
              <div className="profile-main"><Avatar name={user?.name || "Misafir"} size="large"/><div><h3>{user?.name || "Henüz giriş yapmadın"}</h3><p>{user?.email || "DOORA hesabını oluştur, işlerini tek yerden takip et."}</p><span className="profile-status"><span/> {user ? "DOORA üyesi" : "Misafir görünümü"}</span></div></div>
              <div className="profile-actions">{user ? <button className="button button-outline" onClick={signOut}>Oturumu kapat</button> : <button className="button button-dark" onClick={() => setAuthOpen(true)}><LogIn size={16}/> Giriş yap / Üye ol</button>}<button className="button button-outline" onClick={() => toast.info("Profil düzenleme alanı veritabanı bağlantısından sonra açılacak.")}>Profili düzenle</button></div>
              <div className="profile-links"><button onClick={() => toast.info("Yardım merkezi hazırlanıyor.")}><HelpCircle/> Yardım merkezi <ArrowUpRight/></button><button onClick={() => toast.info("Güvenlik ve gizlilik sayfaları yayına hazırlık aşamasında.")}><ShieldCheck/> Güvenlik ve gizlilik <ArrowUpRight/></button></div>
            </div>
          ) : null}

          {activeTab !== "messages" && activeTab !== "profile" ? (
            <>
              <div className="results-heading"><div><h3>{activeTab === "saved" ? "Kaydedilen ilanlar" : activeTab === "my-tasks" ? "Yayınladığın ilanlar" : "Senin için seçtiklerimiz"}</h3><span>{visibleTasks.length} ilan</span></div>{activeTab === "discover" ? <span className="results-note"><span/> Güncel ilanlar</span> : null}</div>
              {visibleTasks.length ? <div className="task-grid">{visibleTasks.map((task) => <TaskCard key={task.id} task={task} saved={savedIds.includes(task.id)} onSave={toggleSave} onOpen={setDetailTask} onOffer={openOffer}/>)}</div> : <div className="empty-state"><span className="empty-icon">{activeTab === "saved" ? <Bookmark size={24}/> : activeTab === "my-tasks" ? <BriefcaseBusiness size={24}/> : <Search size={24}/>}</span><h3>{activeTab === "saved" ? "Henüz ilan kaydetmedin" : activeTab === "my-tasks" ? "Henüz bir iş yayınlamadın" : "Bu kriterlerde ilan bulunamadı"}</h3><p>{activeTab === "saved" ? "Beğendiğin ilanların üzerindeki yer imi simgesine dokun." : activeTab === "my-tasks" ? "İhtiyacını anlat, sana yardımcı olacak kişileri bul." : "Arama kelimeni veya filtrelerini değiştirebilirsin."}</p><button className="button button-dark" onClick={() => activeTab === "my-tasks" ? setCreateOpen(true) : (setActiveTab("discover"), setCategory("Tümü"), setQuery(""))}>{activeTab === "my-tasks" ? "İlk işini yayınla" : "İşleri keşfet"} <ArrowRight size={16}/></button></div>}
            </>
          ) : null}
        </div>
      </section>

      {activeTab === "discover" ? <section className="how-section" id="how-it-works"><div className="how-inner"><div className="center-heading"><div className="eyebrow">ÜÇ KOLAY ADIM</div><h2>İşini halletmek <span>bu kadar kolay.</span></h2><p>İhtiyacını anlat. Doğru kişiyi seç. İşini tamamla.</p></div><div className="steps-grid"><div className="step-card"><span className="step-number">01</span><span className="step-icon"><Plus/></span><h3>İşini paylaş</h3><p>Ne yapılacağını, nerede ve ne zaman gerektiğini anlat. Ücretini belirle.</p></div><div className="step-card"><span className="step-number">02</span><span className="step-icon"><MessageCircle/></span><h3>Teklifleri değerlendir</h3><p>İlgilenen kişilerin tekliflerini ve profillerini karşılaştır. Sana uygun olanı seç.</p></div><div className="step-card"><span className="step-number">03</span><span className="step-icon"><CheckCircle2/></span><h3>Birlikte tamamlayın</h3><p>İşin kapsamını netleştir, tamamlandığında karşılıklı değerlendirme yap.</p></div></div></div></section> : null}

      {activeTab === "discover" ? <section className="safety-section"><div className="safety-inner"><div className="safety-icon"><ShieldCheck size={27}/></div><div><div className="eyebrow">DOORA'DA GÜVEN</div><h2>İyi iş, güvenle başlar.</h2><p>İş kapsamını ve ücreti baştan netleştir. Kişisel bilgilerini koru, platform dışından ödeme yapmadan önce güvenlik adımlarını kontrol et.</p></div><button className="button button-outline" onClick={() => toast.info("Güven merkezi ve destek akışı hazırlanıyor.")}>Güvenlik rehberi <ArrowUpRight size={16}/></button></div></section> : null}

      <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><Brand/><p>Günlük hayatın küçük işleri, birlikte daha kolay.</p></div><div className="footer-links"><a href="#how-it-works">Nasıl çalışır?</a><button onClick={() => toast.info("Yardım merkezi hazırlanıyor.")}>Yardım merkezi</button><button onClick={() => toast.info("Gizlilik politikası yayına hazırlık aşamasında.")}>Gizlilik</button><button onClick={() => toast.info("Kullanım koşulları yayına hazırlık aşamasında.")}>Kullanım koşulları</button></div><span className="copyright">© 2026 DOORA. Tüm hakları saklıdır.</span></div></footer>

      <nav className="bottom-nav" aria-label="Mobil ana menü">{navItems.map((item) => <button key={item.id} className={activeTab === item.id ? "bottom-nav-item active" : "bottom-nav-item"} onClick={() => setActiveTab(item.id)}><item.icon size={19}/><span>{item.label}</span></button>)}</nav>

      {createOpen && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="dialog create-dialog" onSubmit={submitTask}><div className="dialog-header"><div><span className="dialog-kicker">YENİ İLAN</span><h2>Ne yapılmasını istersin?</h2><p>İşini açıkça anlat, sana yardımcı olacak kişiyi bulalım.</p></div><button type="button" className="close-button" onClick={() => setCreateOpen(false)} aria-label="Kapat"><X/></button></div><div className="form-progress"><span/></div><label className="form-label">İşin başlığı<input autoFocus maxLength={90} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Örn. Market alışverişimi yap" /></label><label className="form-label">Kategori<select value={taskForm.category} onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value })}>{categories.slice(1).map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="form-label">İşin detayları<textarea rows={4} maxLength={2000} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Neye ihtiyacın var? İşin kapsamını ve önemli detayları anlat."/><small className="field-hint">{taskForm.description.length}/2000</small></label><div className="form-columns"><label className="form-label">Teklif bütçen (₺)<input type="number" min="1" value={taskForm.budget} onChange={(event) => setTaskForm({ ...taskForm, budget: event.target.value })} placeholder="250"/></label><label className="form-label">Ne zaman?<input type="datetime-local" value={taskForm.scheduledAt} onChange={(event) => setTaskForm({ ...taskForm, scheduledAt: event.target.value })}/></label></div><label className="form-label">İşin yapılacağı konum<input value={taskForm.location} onChange={(event) => setTaskForm({ ...taskForm, location: event.target.value })} placeholder="Mahalle, ilçe, şehir"/></label><label className="upload-box"><ImagePlus size={20}/><span><b>{imageFile ? imageFile.name : "Fotoğraf ekle"}</b><small>İşini anlatan bir görsel ekleyebilirsin · JPG, PNG, WEBP · 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} hidden/>{imageFile && <button type="button" onClick={(event) => { event.preventDefault(); setImageFile(null); }}><Trash2 size={16}/></button>}</label><div className="dialog-note"><ShieldCheck size={15}/><span>Adresinin tam konumunu herkese açık paylaşma. Eşleşme sonrası detayları netleştirebilirsin.</span></div><button className="button button-dark dialog-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Plus size={17}/>} İlanı yayınla <ArrowRight size={17}/></button><p className="legal-note">İlan yayınlayarak DOORA kullanım kurallarına uymayı kabul edersin.</p></form></div>}

      {offerTask && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOfferTask(null); }}><form className="dialog offer-dialog" onSubmit={submitOffer}><div className="dialog-header"><div><span className="dialog-kicker">TEKLİF GÖNDER</span><h2>Bu işi sen halledebilirsin.</h2><p>İş sahibine nasıl yardımcı olacağını anlat.</p></div><button type="button" className="close-button" onClick={() => setOfferTask(null)} aria-label="Kapat"><X/></button></div><div className="offer-summary"><span className="category-tag">{offerTask.category}</span><b>{offerTask.title}</b><span><MapPin size={14}/>{offerTask.location}</span><strong>{money(offerTask.budget)} <small>belirlenen bütçe</small></strong></div><label className="form-label">Teklifin (₺)<input type="number" min="1" value={offerForm.amount} onChange={(event) => setOfferForm({ ...offerForm, amount: event.target.value })}/></label><label className="form-label">İş sahibine mesajın<textarea rows={4} maxLength={800} value={offerForm.message} onChange={(event) => setOfferForm({ ...offerForm, message: event.target.value })} placeholder="Bu işi neden senin yapman gerektiğini, deneyimini ve ne zaman müsait olduğunu anlat."/></label><div className="dialog-note"><ShieldCheck size={15}/><span>İşin kapsamını ve ödeme koşullarını kabul etmeden önce iş sahibiyle netleştir.</span></div><button className="button button-dark dialog-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17}/> : <Send size={16}/>} Teklifi gönder</button></form></div>}

      {detailTask && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailTask(null); }}><div className="dialog detail-dialog"><div className="dialog-header"><div><span className="dialog-kicker">İLAN DETAYI</span><h2>{detailTask.title}</h2></div><button type="button" className="close-button" onClick={() => setDetailTask(null)} aria-label="Kapat"><X/></button></div>{detailTask.imageUrl && <img className="detail-image" src={detailTask.imageUrl} alt="İş görseli"/>}<div className="detail-price-row"><span className="category-tag">{detailTask.category}</span><strong>{money(detailTask.budget)}</strong></div><p className="detail-description">{detailTask.description}</p><div className="detail-facts"><span><MapPin/>{detailTask.location}</span><span><CalendarDays/>{formatDate(detailTask.scheduledAt)}</span><span><Clock3/>{relativeDate(detailTask.createdAt)}</span></div><div className="detail-owner"><Avatar name={detailTask.ownerName} size="large"/><div><b>{detailTask.ownerName}</b><small>İş sahibi · Yeni üye</small></div><span className="detail-offers">{detailTask.offersCount} teklif</span></div><div className="detail-actions"><button className="button button-outline" onClick={() => toggleSave(detailTask.id)}><Bookmark size={16}/>{savedIds.includes(detailTask.id) ? "Kaydedildi" : "Kaydet"}</button><button className="button button-dark" onClick={() => { setOfferTask(detailTask); setDetailTask(null); }}>Teklif ver <ArrowUpRight size={16}/></button></div><p className="legal-note">Bu ilanı kabul etmeden önce iş kapsamını, konumu ve ödeme koşullarını netleştir.</p></div></div>}

      {authOpen && <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><form className="dialog auth-dialog" onSubmit={sendMagicLink}><button type="button" className="close-button auth-close" onClick={() => setAuthOpen(false)} aria-label="Kapat"><X/></button><div className="auth-mark"><span className="brand-symbol">d</span></div><span className="dialog-kicker">DOORA'YA HOŞ GELDİN</span><h2>İşlerini kolaylaştırmaya başla.</h2><p>E-posta adresinle güvenli giriş bağlantısı al.</p><label className="form-label">Adın <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nasıl hitap edelim?"/></label><label className="form-label">E-posta adresin <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@eposta.com"/></label>{demoMode && <div className="setup-hint"><LockKeyhole size={16}/><span>Canlı giriş için Supabase bağlantısı henüz eklenmedi. Ön izleme modunda hesap açma devre dışı.</span></div>}<button className="button button-dark dialog-submit" type="submit" disabled={authBusy || demoMode}>{authBusy ? <LoaderCircle className="spin" size={17}/> : <Mail size={17}/>} E-posta ile devam et</button><small className="legal-note">Devam ederek kullanım koşullarını ve gizlilik politikasını kabul etmiş olursun.</small></form></div>}
    </main>
  );
}

function ShoppingBagIcon() {
  return <span className="shopping-bag-icon"><BriefcaseBusiness size={24}/></span>;
}