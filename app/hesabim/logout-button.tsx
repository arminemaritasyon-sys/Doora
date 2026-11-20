"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result?.error) throw new Error(result.error.message || "Çıkış yapılamadı.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Çıkış yapılamadı. Tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" className="account-logout" onClick={logout} disabled={busy}>
    {busy ? "Çıkış yapılıyor…" : "Çıkış yap"}
  </button>;
}
