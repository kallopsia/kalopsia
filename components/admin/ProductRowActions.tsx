"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import { smallDangerButtonClass, smallSecondaryButtonClass } from "./styles";

interface ProductRowActionsProps {
  id: string;
  kodeBarang: string;
  isActive: boolean;
}

export default function ProductRowActions({ id, kodeBarang, isActive }: ProductRowActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal memperbarui status");
      toast.push(
        isActive ? `${kodeBarang} dinonaktifkan dari toko.` : `${kodeBarang} diaktifkan di toko.`,
        "success"
      );
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal memperbarui status.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Hapus permanen produk ${kodeBarang}?\n\nTindakan ini tidak bisa dibatalkan. Gunakan "nonaktifkan" bila hanya ingin menyembunyikannya dari toko.`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal menghapus");
      toast.push(`${kodeBarang} dihapus.`, "success");
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menghapus produk.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-[6px] justify-end">
      <Link
        href={`/admin/products/${id}`}
        className="border border-[#D6D6D6] bg-[#FFFFFF] px-[10px] py-[6px] text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover:border-[#0071BB] hover:text-[#0071BB] transition-colors"
      >
        ubah
      </Link>
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className={smallSecondaryButtonClass}
      >
        {isActive ? "nonaktifkan" : "aktifkan"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className={smallDangerButtonClass}
      >
        hapus
      </button>
    </div>
  );
}
