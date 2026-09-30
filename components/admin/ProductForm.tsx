"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageManager, { type CloudinaryConfig } from "./ImageManager";
import { useToast } from "./Toast";
import {
  badgeClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./styles";
import { formatSrp } from "@/lib/pricing";

export type ProductFormInitial = {
  kode_barang: string;
  spesifikasi: string;
  nama_produk: string | null;
  notes: string | null;
  srp: number;
  stok: number | null;
  is_active: boolean;
  is_featured: boolean;
  image_urls: string[];
};

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initial?: ProductFormInitial;
  cloudinary: CloudinaryConfig;
}

export default function ProductForm({ mode, productId, initial, cloudinary }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [kodeBarang, setKodeBarang] = useState(initial?.kode_barang ?? "");
  const [spesifikasi, setSpesifikasi] = useState(initial?.spesifikasi ?? "");
  const [namaProduk, setNamaProduk] = useState(initial?.nama_produk ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [srp, setSrp] = useState<string>(String(initial?.srp ?? 0));
  const [stok, setStok] = useState<string>(
    initial?.stok === null || initial?.stok === undefined ? "" : String(initial.stok)
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.image_urls ?? []);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const srpNumber = Number(srp) || 0;
  const stokValue = stok.trim() === "" ? null : Number(stok);
  const isEdit = mode === "edit";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      kode_barang: kodeBarang.trim(),
      spesifikasi: spesifikasi.trim(),
      nama_produk: namaProduk.trim() || null,
      notes: notes.trim() || null,
      srp: srpNumber,
      stok: stokValue,
      is_active: isActive,
      is_featured: isFeatured,
      image_urls: imageUrls,
    };

    try {
      const response = await fetch(
        isEdit ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(result?.error || "Gagal menyimpan produk.");
        setSaving(false);
        return;
      }
      toast.push(isEdit ? "Perubahan produk disimpan." : "Produk baru ditambahkan.", "success");
      router.push("/admin/products");
      router.refresh();
    } catch {
      setFormError("Jaringan bermasalah. Coba lagi.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] md:p-[24px]">
      <div className="mb-[16px]">
        <label className={labelClass} htmlFor="nama_produk">
          Nama produk (opsional — kosongkan untuk pakai teks spesifikasi)
        </label>
        <input
          id="nama_produk"
          value={namaProduk}
          onChange={(event) => setNamaProduk(event.target.value)}
          placeholder="Acer Aspire 7 Pro A715"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[16px]">
        <div>
          <label className={labelClass} htmlFor="kode_barang">
            Kode barang {isEdit && "(kunci, tidak bisa diubah)"}
          </label>
          <input
            id="kode_barang"
            value={kodeBarang}
            onChange={(event) => setKodeBarang(event.target.value)}
            disabled={isEdit}
            required
            placeholder="A715-59G-516S"
            className={inputClass}
          />
          <p className="mt-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
            tanpa prefix PR-LAP-&lt;brand&gt;- (prefix lama dibuang otomatis saat impor)
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="srp">
            SRP (ribu rupiah)
          </label>
          <input
            id="srp"
            type="number"
            min={0}
            step={1}
            value={srp}
            onChange={(event) => setSrp(event.target.value)}
            className={inputClass}
          />
          <div className="mt-[4px] flex items-center gap-[8px]">
            <span className="text-[12px] tabular-nums text-[#0F0E12]">{formatSrp(srpNumber)}</span>
            {srpNumber <= 0 && <span className={badgeClass("grey")}>harga belum tersedia</span>}
          </div>
        </div>
      </div>

      <div className="mb-[16px]">
        <label className={labelClass} htmlFor="spesifikasi">
          Spesifikasi (teks dari kolom SPESIFIKASI Excel)
        </label>
        <textarea
          id="spesifikasi"
          value={spesifikasi}
          onChange={(event) => setSpesifikasi(event.target.value)}
          required
          rows={3}
          placeholder="ACER ASPIRE 7 PRO A715 I5 13420H RTX3050 6GB/16GB 512GB W11+OHS 15.6FHD IPS 144HZ BLK"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[16px]">
        <div>
          <label className={labelClass} htmlFor="notes">
            Notes (disimpan apa adanya)
          </label>
          <input
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="(BP NEO)"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="stok">
            Stok (kosongkan = tidak dilacak / selalu tersedia)
          </label>
          <input
            id="stok"
            type="number"
            min={0}
            step={1}
            value={stok}
            onChange={(event) => setStok(event.target.value)}
            placeholder="kosong = tak dilacak"
            className={inputClass}
          />
          <div className="mt-[4px] flex items-center gap-[8px]">
            {stokValue === null ? (
              <span className={badgeClass("grey")}>stok tidak dilacak</span>
            ) : stokValue > 0 ? (
              <span className={badgeClass("green")}>{stokValue} tersedia</span>
            ) : (
              <span className={badgeClass("red")}>habis — tampil &ldquo;tidak tersedia&rdquo;</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-[24px] border-t border-[#D6D6D6] pt-[16px]">
        <ImageManager value={imageUrls} onChange={setImageUrls} config={cloudinary} />
      </div>

      <label className="flex items-center gap-[8px] text-[13px] text-[#0F0E12] mb-[24px]">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Aktif di toko (is_active)
      </label>

      <label className="flex items-center gap-[8px] text-[13px] text-[#0F0E12] mb-[24px]">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(event) => setIsFeatured(event.target.checked)}
        />
        Tampilkan di landing page (is_featured, maksimal 8 produk pertama yang dicentang)
      </label>

      {formError && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
          {formError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[8px]">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "menyimpan..." : isEdit ? "simpan perubahan" : "tambah produk"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className={secondaryButtonClass}
        >
          batal
        </button>
      </div>
    </form>
  );
}
