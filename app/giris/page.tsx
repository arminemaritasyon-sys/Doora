"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, Lock, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type ResetStep = "request" | "verify" | null;

function getSafeNextPath() {
  if (typeof window === "undefined") return "/";
  const candidate = new URLSearchParams(window.location.search).get("next");
  return candidate && candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
}

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  function updateOtp(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp(current => {
      const next = current.padEnd(6, " ").split("");
      next[index] = digit;
      return next.join("").replace(/\s/g, "").slice(0, 6);
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  const [showPassword, setShowPassword] = useState(false);
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function resendCode() {
    setBusy(true);
    setMessage("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: resetStep ? "forget-password" : "email-verification"
      });
      if (result.error) throw new Error(result.error.message || "Yeni kod gönderilemedi.");
      setMessage("Yeni doğrulama kodunu e-posta adresine gönderdik.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kod gönderilemedi. Biraz sonra tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (resetStep === "request") {
        const result = await authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" });
        if (result.error) throw new Error(result.error.message || "Şifre yenileme kodu gönderilemedi.");
        setResetStep("verify");
        setOtp("");
        setMessage("Şifre yenileme kodunu e-posta adresine gönderdik.");
        return;
      }

      if (resetStep === "verify") {
        if (password.length < 8) throw new Error("Yeni şifren en az 8 karakter olmalı.");
        if (password !== confirmPassword) throw new Error("Şifreler birbiriyle eşleşmiyor.");
        const checked = await authClient.emailOtp.checkVerificationOtp({ email, otp, type: "forget-password" });
        if (checked.error || !checked.data?.success) throw new Error(checked.error?.message || "Doğrulama kodu geçersiz veya süresi dolmuş.");
        const result = await authClient.emailOtp.resetPassword({ email, otp, password });
        if (result.error) throw new Error(result.error.message || "Şifre yenilenemedi.");
        setResetStep(null);
        setMode("signin");
        setOtp("");
        setPassword("");
        setConfirmPassword("");
        setMessage("Şifren yenilendi. Yeni şifrenle giriş yapabilirsin.");
        return;
      }

      if (verify) {
        const result = await authClient.emailOtp.verifyEmail({ email, otp });
        if (result.error) throw new Error(result.error.message || "Kod doğrulanamadı.");
        const login = await authClient.signIn.email({ email, password });
        if (login.error) throw new Error(login.error.message || "E-posta doğrulandı. Şimdi giriş yapabilirsin.");
        router.replace(getSafeNextPath());
        router.refresh();
      } else if (mode === "signup") {
        if (password !== confirmPassword) throw new Error("Şifreler birbiriyle eşleşmiyor.");
        const result = await authClient.signUp.email({ email, password, name });
        if (result.error) throw new Error(result.error.message || "Kayıt tamamlanamadı.");
        setVerify(true);
        setMessage("Doğrulama kodunu e-posta adresine gönderdik.");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message || "Giriş yapılamadı.");
        router.replace(getSafeNextPath());
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bir hata oluştu. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  const otpMode = verify || resetStep === "verify";
  const title = resetStep
    ? resetStep === "request" ? "Şifreni yenile" : "Yeni şifreni belirle"
    : verify ? "E-postanı doğrula"
    : mode === "signin" ? "Tekrar merhaba." : "Aramıza katıl.";
  const description = resetStep
    ? resetStep === "request" ? "E-posta adresine şifre yenileme kodu gönderelim." : "E-postana gelen 6 haneli kodu ve yeni şifreni gir."
    : verify ? "E-posta adresine gönderdiğimiz 6 haneli kodu gir."
    : mode === "signin" ? "Hesabına giriş yap, işlerini kolayca hallet." : "Birkaç bilgiyle DOORA hesabını oluştur.";

  return (
    <main className="auth-page">
      <a className="auth-back" href="/"><ArrowLeft size={17}/> Ana sayfa</a>
      <motion.section className="auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>
        <a className="brand auth-brand" href="/"><span className="brand-mark">d</span><span>doora<span className="brand-dot">.</span></span></a>
        <span className="eyebrow">DOORA'YA HOŞ GELDİN</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && !verify && !resetStep && <label><span>Ad soyad</span><div className="auth-input"><UserRound size={18}/><input value={name} onChange={e => setName(e.target.value)} placeholder="Adın ve soyadın" required minLength={2} maxLength={100}/></div></label>}
          <label><span>E-posta</span><div className="auth-input"><Mail size={18}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@mail.com" required disabled={otpMode}/></div></label>
          {otpMode && <label className="auth-otp-label"><span>6 haneli doğrulama kodu</span><div className="auth-otp-grid" dir="ltr">{Array.from({ length: 6 }, (_, index) => <input key={index} ref={el => { otpRefs.current[index] = el; }} aria-label={`${index + 1}. doğrulama rakamı`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} pattern="[0-9]*" maxLength={1} value={otp[index] || ""} onChange={e => updateOtp(index, e.target.value)} onKeyDown={e => { if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus(); if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus(); if (e.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus(); }} onPaste={e => { if (index === 0) { const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (digits) { e.preventDefault(); setOtp(digits); otpRefs.current[Math.min(digits.length, 5)]?.focus(); } } }}/>)}</div></label>}
          {((!otpMode && resetStep !== "request") || resetStep === "verify") && <label><span>{resetStep === "verify" ? "Yeni şifre" : "Şifre"}</span><div className="auth-input"><Lock size={18}/><input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 8 karakter" required minLength={8}/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Şifreyi göster">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>}
          {(mode === "signup" && !verify || resetStep === "verify") && <label><span>Şifre tekrar</span><div className="auth-input"><Lock size={18}/><input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Şifreni tekrar gir" required minLength={8}/></div></label>}
          {message && <div className="auth-message" role="status">{message}</div>}
          {otpMode && <button type="button" className="auth-resend" onClick={resendCode} disabled={busy}>Kodu tekrar gönder</button>}
          {mode === "signin" && !verify && !resetStep && <button type="button" className="auth-resend" onClick={() => { setResetStep("request"); setPassword(""); setMessage(""); }}>Şifremi unuttum</button>}
          {resetStep && <button type="button" className="auth-resend" onClick={() => { setResetStep(null); setOtp(""); setPassword(""); setConfirmPassword(""); setMessage(""); }}>Girişe dön</button>}
          <button className="button button-dark auth-submit" disabled={busy || (otpMode && otp.length !== 6)}>{busy ? "Lütfen bekle…" : resetStep === "request" ? "Kod gönder" : resetStep === "verify" ? "Şifreyi yenile" : verify ? "E-postayı doğrula" : mode === "signin" ? "Giriş yap" : "Hesap oluştur"} <ArrowRight size={17}/></button>
        </form>
        {!verify && !resetStep && <div className="auth-switch">{mode === "signin" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"} <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); setPassword(""); setConfirmPassword(""); }}>{mode === "signin" ? "Hesap oluştur" : "Giriş yap"}</button></div>}
        {!resetStep && !verify && <small className="auth-legal">Devam ederek Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursun.</small>}
      </motion.section>
    </main>
  );
}
