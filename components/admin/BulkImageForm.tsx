"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { cardClass, inputClass, labelClass, primaryButtonClass } from "./styles";

interface BulkImageFormProps {
  cloudName: string;
}

type BulkResult = {
  updated: number;
  processed: number;
  missing: string[];
  errors: { line: number; message: string }[];
};

const EXAMPLE = `kode_barang,image_url
PR-LAP-AC-A715-59G-516S,https://res.cloudinary.com/CONTOH/image/upload/v1/notebook-archive/a715.jpg`;

export default function BulkImageForm({ cloudName }: BulkImageFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkResult | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!csv.trim()) {
      setError("Tempel dulu isi CSV-nya.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Gagal memproses CSV.");
        toast.push(payload?.error || "Gagal memproses CSV.", "error");
        return;
      }
      setResult(payload as BulkResult);
      toast.push(`${payload.updated} URL gambar ditambahkan.`, "success");
      router.refresh();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} p-[16px] md:p-[24px]`}>
      <label className={labelClass} htmlFor="bulk-csv">
        CSV gambar (kode_barang,image_url)
      </label>
      <textarea
        id="bulk-csv"
        rows={10}
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
        placeholder={EXAMPLE}
        className={`${inputClass} font-mono text-[12px]`}
      />
      <p className="mt-[8px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        URL wajib berada di https://res.cloudinary.com/
        {cloudName || "<CLOUD_NAME>"}/... — baris lain dilaporkan sebagai error. URL ditambahkan ke
        daftar gambar produk (tidak menggantikan yang sudah ada).
      </p>

      {error && (
        <div className="mt-[16px] border border-[#B00020] bg-[#FFFFFF] p-[12px] text-[12px] leading-[1.5] text-[#B00020]">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-[16px] border border-[#D6D6D6] bg-[#F5F5F5] p-[12px] text-[12px] leading-[1.6] text-[#0F0E12]">
          <div>
            {result.updated} URL ditambahkan dari {result.processed} baris valid.
          </div>
          {result.missing.length > 0 && (
            <div className="mt-[8px] text-[#767676]">
              Kode barang tidak ditemukan di database: {result.missing.join(", ")}
            </div>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-[8px] text-[#B00020]">
              {result.errors.map((item) => (
                <li key={item.line}>
                  baris {item.line}: {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="submit" disabled={busy} className={`${primaryButtonClass} mt-[16px]`}>
        {busy ? "memproses..." : "simpan gambar massal"}
      </button>
    </form>
  );
}
