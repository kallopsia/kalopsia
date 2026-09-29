"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SingleImageField from "./SingleImageField";
import type { CloudinaryConfig } from "./ImageManager";
import { useToast } from "./Toast";
import {
  badgeClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./styles";
import { formatRupiah } from "@/lib/pricing";
import { slugify } from "@/lib/slug";

export type ServiceItemKind = "software" | "sparepart";

export type ServiceItemFormInitial = {
  nama: string;
  slug: string;
  image_url: string;
  harga: number;
  text: string;
  is_active: boolean;
};

interface ServiceItemFormProps {
  kind: ServiceItemKind;
  mode: "create" | "edit";
  itemId?: string;
  initial?: ServiceItemFormInitial;
  cloudinary: CloudinaryConfig;
}

const COPY: Record<
  ServiceItemKind,
  { entity: string; textField: string; textLabel: string; textPlaceholder: string; listPath: string }
> = {
  software: {
    entity: "software",
    textField: "spesifikasi_minimum",
    textLabel: "Spesifikasi minimum (teks bebas)",
    textPlaceholder: "RAM 8 GB, ruang kosong 10 GB, Windows 10/11 64-bit.",
    listPath: "/admin/software",
  },
  sparepart: {
    entity: "sparepart",
    textField: "deskripsi",
    textLabel: "Deskripsi (kondisi, kompatibilitas, garansi)",
    textPlaceholder: "Bekas unit resmi, kondisi 95%, cocok untuk seri Aspire 5.",
    listPath: "/admin/sparepart",
  },
};

export default function ServiceItemForm({
  kind,
  mode,
  itemId,
  initial,
  cloudinary,
}: ServiceItemFormProps) {
  const router = useRouter();
  const toast = useToast();
  const copy = COPY[kind];

  const [nama, setNama] = useState(initial?.nama ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [harga, setHarga] = useState<string>(String(initial?.harga ?? 0));
  const [text, setText] = useState(initial?.text ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const hargaNumber = Number(harga) || 0;
  const isEdit = mode === "edit";
  const endpoint = isEdit ? `/api/admin/${kind}/${itemId}` : `/api/admin/${kind}`;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      nama: nama.trim(),
      slug: slug.trim() || slugify(nama),
      image_url: imageUrl.trim(),
      harga: hargaNumber,
      is_active: isActive,
      [copy.textField]: text.trim() || null,
    };

    try {
      const response = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(result?.error || `Gagal menyimpan ${copy.entity}.`);
        return;
      }
      toast.push(
        isEdit ? `Perubahan ${copy.entity} disimpan.` : `${copy.entity} baru ditambahkan.`,
        "success"
      );
      router.push(copy.listPath);
      router.refresh();
    } catch {
      setFormError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] md:p-[24px]"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[16px]">
        <div>
          <label className={labelClass} htmlFor="nama">
            Nama {copy.entity}
          </label>
          <input
            id="nama"
            value={nama}
            onChange={(event) => {
              setNama(event.target.value);
              if (!isEdit && !slug.trim()) setSlug(slugify(event.target.value));
            }}
            required
            placeholder={kind === "software" ? "Microsoft Office 2021" : "SSD NVMe 512 GB"}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="slug">
            Slug (untuk URL, boleh dikosongkan)
          </label>
          <input
            id="slug"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            placeholder={kind === "software" ? "microsoft-office-2021" : "ssd-nvme-512-gb"}
            className={inputClass}
          />
          <p className="mt-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
            kosong = diturunkan otomatis dari nama
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[16px]">
        <div>
          <label className={labelClass} htmlFor="harga">
            {kind === "software" ? "Harga jasa install" : "Harga"} (rupiah penuh)
          </label>
          <input
            id="harga"
            type="number"
            min={0}
            step={1000}
            value={harga}
            onChange={(event) => setHarga(event.target.value)}
            className={inputClass}
          />
          <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
            <span className="text-[12px] tabular-nums text-[#0F0E12]">
              {hargaNumber > 0 ? formatRupiah(hargaNumber) : "-"}
            </span>
            {hargaNumber <= 0 && <span className={badgeClass("grey")}>hubungi kami</span>}
          </div>
        </div>
      </div>

      <div className="mb-[16px]">
        <label className={labelClass} htmlFor="text">
          {copy.textLabel}
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          placeholder={copy.textPlaceholder}
          className={inputClass}
        />
      </div>

      <div className="mb-[24px] border-t border-[#D6D6D6] pt-[16px]">
        <SingleImageField
          value={imageUrl}
          onChange={setImageUrl}
          config={cloudinary}
          label="Gambar (URL Cloudinary; kosong = placeholder otomatis)"
          previewAlt={nama || `Gambar ${copy.entity}`}
        />
      </div>

      <label className="flex items-center gap-[8px] text-[13px] text-[#0F0E12] mb-[24px]">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Aktif di toko (is_active)
      </label>

      {formError && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
          {formError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[8px]">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "menyimpan..." : isEdit ? "simpan perubahan" : `tambah ${copy.entity}`}
        </button>
        <button
          type="button"
          onClick={() => router.push(copy.listPath)}
          className={secondaryButtonClass}
        >
          batal
        </button>
      </div>
    </form>
  );
}
