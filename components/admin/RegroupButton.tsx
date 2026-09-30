"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import { secondaryButtonClass } from "./styles";

export default function RegroupButton() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const confirmed = window.confirm(
      "Kelompokkan ulang semua produk berdasarkan warna?\n\n" +
        "Warna dideteksi ulang dari spesifikasi (override manual tidak ditimpa), lalu varian " +
        "dengan nama + spesifikasi + kategori layar sama digabung ke satu halaman. " +
        "Duplikat (warna sama persis) ditandai untuk direview, tidak digabung."
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch("/api/admin/products/regroup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal mengelompokkan ulang.");
      toast.push(
        `Selesai: ${payload.groups} grup, ${payload.grouped} produk tergabung, ` +
          `${payload.duplicates} duplikat ditandai, ${payload.changed} baris berubah.`,
        "success"
      );
      router.refresh();
    } catch (error) {
      toast.push(
        error instanceof Error ? error.message : "Gagal mengelompokkan ulang.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={run} disabled={busy} className={secondaryButtonClass}>
      {busy ? "memproses..." : "kelompokkan ulang semua produk"}
    </button>
  );
}
