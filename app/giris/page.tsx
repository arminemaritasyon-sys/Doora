"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, Lock, UserRound, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export default function SignInPage() {
  const router = useRouter();
  const [mode,setMode] = useState<"signin"|"signup">("signin");
  const [email,setEmail] = useState("");
  const [name,setName] = useState("");
  const [password,setPassword] = useState("");
  const [otp,setOtp] = useState("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  function updateOtp(index:number, value:string) {
    const digit = value.replace(/\\D/g, "").slice(-1);
    setOtp(current => { const next = current.padEnd(6, " ").split(""); next[index] = digit; return next.join("").replace(/\\s/g, "").slice(0, 6); });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }
  const [showPassword,setShowPassword] = useState(false);
  const [verify,setVerify] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (verify) {
        const result = await authClient.emailOtp.verifyEmail({ email, otp });
        if (result.error) throw new Error(result.error.message || "Kod doğrulanamadı.");
        const login = await authClient.signIn.email({ email, password });
        if (login.error) throw new Error(login.error.message || "E-posta doğrulandı. Şimdi giriş yapabilirsin.");
        router.replace("/");
        router.refresh();
      } else if (mode === "signup") {
        const result = await authClient.signUp.email({ email, password, name });
        if (result.error) throw new Error(result.error.message || "Kayıt tamamlanamadı.");
        setVerify(true);
        setMessage("Doğrulama kodunu e-posta adresine gönderdik.");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message || "Giriş yapılamadı.");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bir hata oluştu. Tekrar dene.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <a className="auth-back" href="/"><ArrowLeft size={17}/> Ana sayfa</a>
      <motion.section className="auth-card" initial={{ opacity:0,y:18 }} animate={{ opacity:1,y:0 }} transition={{ duration:.35 }}>
        <a className="brand auth-brand" href="/"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></a>
        <span className="eyebrow">DOORA'YA HOŞ GELDİN</span>
        <h1>{verify ? "E-postanı doğrula" : mode === "signin" ? "Tekrar merhaba." : "Aramıza katıl."}</h1>
        <p>{verify ? "E-posta adresine gönderdiğimiz 6 haneli kodu gir." : mode === "signin" ? "Hesabına giriş yap, işlerini kolayca hallet." : "Birkaç bilgiyle DOORA hesabını oluştur."}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && !verify && <label><span>Ad soyad</span><div className="auth-input"><UserRound size={18}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Adın ve soyadın" required minLength={2}/></div></label>}
          <label><span>E-posta</span><div className="auth-input"><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ornek@mail.com" required disabled={verify}/></div></label>
          {verify ? <label className="auth-otp-label"><span>6 haneli doğrulama kodu</span><div className="auth-otp-grid" dir="ltr">{Array.from({length:6},(_,index)=><input key={index} ref={el=>{otpRefs.current[index]=el}} aria-label={`${index+1}. doğrulama rakamı`} inputMode="numeric" autoComplete={index===0?"one-time-code":"off"} pattern="[0-9]*" maxLength={1} value={otp[index]||""} onChange={e=>updateOtp(index,e.target.value)} onKeyDown={e=>{if(e.key==="Backspace"&&!otp[index]&&index>0)otpRefs.current[index-1]?.focus();if(e.key==="ArrowLeft"&&index>0)otpRefs.current[index-1]?.focus();if(e.key==="ArrowRight"&&index<5)otpRefs.current[index+1]?.focus()}} onPaste={e=>{if(index===0){const digits=e.clipboardData.getData("text").replace(/\\D/g,"").slice(0,6);if(digits){e.preventDefault();setOtp(digits);otpRefs.current[Math.min(digits.length,5)]?.focus()}}}} />)}</div></label> : <label><span>Şifre</span><div className="auth-input"><Lock size={18}/><input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="En az 8 karakter" required minLength={8}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label="Şifreyi göster">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
          {message && <div className="auth-message" role="status">{message}</div>}
          <button className="button button-dark auth-submit" disabled={busy || (verify && otp.length !== 6)}>{busy?"Lütfen bekle…":verify?"E-postayı doğrula":mode==="signin"?"Giriş yap":"Hesap oluştur"} <ArrowRight size={17}/></button>
        </form>
        {!verify && <div className="auth-switch">{mode==="signin"?"Henüz hesabın yok mu?":"Zaten hesabın var mı?"} <button onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("");}}>{mode==="signin"?"Hesap oluştur":"Giriş yap"}</button></div>}
        <small className="auth-legal">Devam ederek Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursun.</small>
      </motion.section>
    </main>
  );
}
