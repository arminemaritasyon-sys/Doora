"use client";

import { useState } from "react";

export function VerificationToggle({
  userId,
  initialVerified,
}: {
  userId: string;
  initialVerified: boolean;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, verified: !verified }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "İşlem tamamlanamadı.");
      setVerified(!verified);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "İşlem tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        style={{
          border: "1px solid #dfe7d8",
          borderRadius: 999,
          padding: "6px 10px",
          background: verified ? "#e9f4e7" : "#fff",
          color: verified ? "#315c36" : "#59635a",
          fontSize: 10,
          fontWeight: 800,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.6 : 1,
          whiteSpace: "nowrap",
        }}
      >
        {busy ? "Kaydediliyor…" : verified ? "✓ Doğrulanmış" : "Doğrula"}
      </button>
      {error ? <small style={{ color: "#b42318", maxWidth: 150, textAlign: "right" }}>{error}</small> : null}
    </span>
  );
}
