"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import { secondaryButtonClass } from "./styles";

export default function RecategorizeButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const confirmed = window.confirm(
      "Kategorikan ulang layar semua produk secara otomatis?\n\nOverride manual yang sudah Anda atur tidak akan ditimpa."
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch("/api/admin/products/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal mengkategorikan ulang.");
      toast.push(
        `Selesai: ${payload.changed} diperbarui, ${payload.uncategorized} belum terkategori, ${payload.skippedManual} manual dilewati.`,
        "success"
      );
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal mengkategorikan ulang.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={run} disabled={busy} className={secondaryButtonClass}>
      {busy ? "memproses..." : "kategorikan ulang semua layar"}
    </button>
  );
}
