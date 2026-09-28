"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import {
  badgeClass,
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
  tableCellClass,
  tableHeadClass,
} from "./styles";
import { formatSrp } from "@/lib/pricing";
import type { MissingAction } from "@/lib/import";

type Summary = {
  filename: string;
  sheetName: string;
  dataRowCount: number;
  validRows: number;
  added: number;
  changed: number;
  missing: number;
  unchanged: number;
  errors: number;
  warnings: string[];
};

type FieldChange = { field: string; label: string; from: string; to: string };

type Preview = {
  summary: Summary;
  diff: {
    added: {
      rowNumber: number;
      kode_barang: string;
      spesifikasi: string;
      notes: string;
      srp: number;
    }[];
    changed: { rowNumber: number; kode_barang: string; changes: FieldChange[] }[];
    missing: {
      id: string;
      kode_barang: string;
      spesifikasi: string;
      is_active: boolean;
      has_image: boolean;
    }[];
    errors: { rowNumber: number | null; message: string }[];
    unchanged: number;
    existingCount: number;
  };
};

type ApplyResult = {
  added: number;
  changed: number;
  deactivated: number;
  deleted: number;
  errorCount: number;
  errors: { rowNumber: number | null; message: string }[];
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const MISSING_OPTIONS: { value: MissingAction; label: string; hint: string }[] = [
  {
    value: "deactivate",
    label: "Nonaktifkan (soft delete) — default",
    hint: "Produk disembunyikan dari toko tapi datanya tetap ada dan bisa diaktifkan lagi.",
  },
  {
    value: "keep",
    label: "Biarkan apa adanya",
    hint: "Produk yang tidak ada di file tetap aktif di toko.",
  },
  {
    value: "delete",
    label: "Hapus permanen",
    hint: "Baris dihapus dari database, termasuk URL gambar yang tersimpan.",
  },
];

export default function ImportPanel() {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"" | "preview" | "apply">("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [missingAction, setMissingAction] = useState<MissingAction>("deactivate");
  const [error, setError] = useState("");

  const acceptFile = (candidate: File | null | undefined) => {
    if (!candidate) return;
    if (!/\.xlsx$/i.test(candidate.name)) {
      setError("Format harus .xlsx. Sheet selain LAPTOP akan diabaikan otomatis.");
      return;
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setError("Ukuran file maksimal 10 MB.");
      return;
    }
    setError("");
    setPreview(null);
    setResult(null);
    setFile(candidate);
  };

  const send = async (mode: "preview" | "apply") => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);
    form.append("missingAction", missingAction);

    setBusy(mode);
    setError("");
    try {
      const response = await fetch("/api/admin/import", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Impor gagal diproses server.");
        toast.push(payload?.error || "Impor gagal.", "error");
        return;
      }
      if (mode === "preview") {
        setPreview(payload as Preview);
        setResult(null);
        toast.push("Pratinjau perubahan siap diperiksa.", "success");
      } else {
        setResult(payload.result as ApplyResult);
        setPreview(null);
        toast.push(
          `Impor selesai: ${payload.result.added} baru, ${payload.result.changed} berubah.`,
          "success"
        );
        router.refresh();
      }
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
      toast.push("Jaringan bermasalah.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          acceptFile(event.dataTransfer.files?.[0]);
        }}
        className={`${cardClass} p-[24px] mb-[16px] border-dashed ${
          dragging ? "border-[#0071BB]" : ""
        }`}
      >
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
          tarik & lepas file excel (.xlsx)
        </div>
        <div className="text-[14px] text-[#0F0E12] mb-[16px]">
          Hanya sheet <strong>LAPTOP</strong> yang dibaca (TELCO, PC HOM ELE, SOF COM SUP diabaikan).
          Kolom yang dipakai: KODEBARANG, SPESIFIKASI, NOTES, SRP. Kolom{" "}
          <strong>M1 dan M1 vs LAMA diabaikan total</strong>.
        </div>

        <div className="flex flex-wrap items-center gap-[12px]">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={secondaryButtonClass}
          >
            pilih file
          </button>
          {file && (
            <span className="text-[12px] text-[#0F0E12]">
              {file.name}{" "}
              <span className="text-[#767676]">({Math.round(file.size / 1024)} KB)</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void send("preview")}
            disabled={!file || busy !== ""}
            className={secondaryButtonClass}
          >
            {busy === "preview" ? "memeriksa..." : "periksa & lihat diff"}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
          {error}
        </div>
      )}

      {preview && (
        <>
          <div className={`${cardClass} p-[16px] mb-[16px]`}>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[12px]">
              {`pratinjau // ${preview.summary.filename} // sheet ${preview.summary.sheetName}`}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6]">
              {[
                { label: "Baris data", value: preview.summary.dataRowCount },
                { label: "Valid", value: preview.summary.validRows },
                { label: "Baru", value: preview.summary.added },
                { label: "Berubah", value: preview.summary.changed },
                { label: "Tidak di file", value: preview.summary.missing },
                { label: "Tidak berubah", value: preview.summary.unchanged },
                { label: "Error", value: preview.summary.errors },
              ].map((item) => (
                <div key={item.label} className="bg-[#FFFFFF] p-[12px]">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                    {item.label}
                  </div>
                  <div className="text-[20px] tabular-nums text-[#0F0E12]">{item.value}</div>
                </div>
              ))}
            </div>
            {preview.summary.warnings.length > 0 && (
              <ul className="mt-[12px] text-[12px] text-[#767676]">
                {preview.summary.warnings.map((warning) => (
                  <li key={warning}>! {warning}</li>
                ))}
              </ul>
            )}
          </div>

          <fieldset className={`${cardClass} p-[16px] mb-[16px]`}>
            <legend className="text-[11px] uppercase tracking-[0.08em] text-[#767676] px-[4px]">
              produk yang tidak ada di file
            </legend>
            <div className="flex flex-col gap-[8px]">
              {MISSING_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-start gap-[8px] text-[13px] text-[#0F0E12]">
                  <input
                    type="radio"
                    name="missingAction"
                    value={option.value}
                    checked={missingAction === option.value}
                    onChange={() => setMissingAction(option.value)}
                    className="mt-[3px]"
                  />
                  <span>
                    {option.label}
                    <span className="block text-[11px] uppercase tracking-[0.08em] text-[#767676]">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <DiffSection
            title={`Baru (${preview.diff.added.length})`}
            empty="Tidak ada produk baru."
            items={preview.diff.added}
            render={(row) => (
              <tr key={row.kode_barang}>
                <td className={tableCellClass}>{row.rowNumber}</td>
                <td className={`${tableCellClass} break-all`}>{row.kode_barang}</td>
                <td className={tableCellClass}>{row.spesifikasi}</td>
                <td className={tableCellClass}>{row.notes || "-"}</td>
                <td className={`${tableCellClass} tabular-nums whitespace-nowrap`}>
                  {row.srp > 0 ? formatSrp(row.srp) : <span className={badgeClass("grey")}>belum tersedia</span>}
                </td>
              </tr>
            )}
            head={["Baris", "Kode barang", "Spesifikasi", "Notes", "SRP"]}
          />

          <DiffSection
            title={`Berubah (${preview.diff.changed.length})`}
            empty="Tidak ada perubahan. Impor ulang file yang sama tidak mengubah apa pun."
            items={preview.diff.changed}
            render={(row) => (
              <tr key={row.kode_barang}>
                <td className={tableCellClass}>{row.rowNumber}</td>
                <td className={`${tableCellClass} break-all`}>{row.kode_barang}</td>
                <td className={tableCellClass}>
                  <ul className="flex flex-col gap-[4px]">
                    {row.changes.map((change, index) => (
                      <li key={`${change.field}-${index}`} className="text-[12px] leading-snug">
                        <span className="uppercase tracking-[0.08em] text-[#767676]">
                          {change.label}
                        </span>
                        : <span className="line-through text-[#767676]">{change.from}</span> →{" "}
                        <span className="text-[#0071BB]">{change.to}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
            head={["Baris", "Kode barang", "Perubahan (lama → baru)"]}
          />

          <DiffSection
            title={`Tidak ada di file (${preview.diff.missing.length})`}
            empty="Semua produk di database ada di file."
            items={preview.diff.missing}
            render={(row) => (
              <tr key={row.id}>
                <td className={`${tableCellClass} break-all`}>{row.kode_barang}</td>
                <td className={tableCellClass}>{row.spesifikasi}</td>
                <td className={tableCellClass}>
                  <span className={badgeClass(row.is_active ? "green" : "grey")}>
                    {row.is_active ? "aktif" : "nonaktif"}
                  </span>
                </td>
                <td className={tableCellClass}>{row.has_image ? "punya gambar" : "tanpa gambar"}</td>
              </tr>
            )}
            head={["Kode barang", "Spesifikasi", "Status", "Gambar"]}
          />

          <DiffSection
            title={`Error baris (${preview.diff.errors.length})`}
            empty="Tidak ada baris yang gagal validasi."
            items={preview.diff.errors}
            render={(row, index) => (
              <tr key={`${row.rowNumber}-${index}`}>
                <td className={tableCellClass}>{row.rowNumber ?? "-"}</td>
                <td className={`${tableCellClass} text-[#B00020]`}>{row.message}</td>
              </tr>
            )}
            head={["Baris Excel", "Alasan"]}
          />

          <div className={`${cardClass} p-[16px] flex flex-wrap items-center gap-[12px]`}>
            <button
              type="button"
              onClick={() => void send("apply")}
              disabled={busy !== ""}
              className={primaryButtonClass}
            >
              {busy === "apply" ? "menerapkan..." : "terapkan perubahan"}
            </button>
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              gambar produk (image_urls) tidak pernah diubah oleh impor
            </span>
          </div>
        </>
      )}

      {result && (
        <div className={`${cardClass} p-[16px] mt-[16px]`}>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[12px]">
            hasil impor
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6]">
            {[
              { label: "Ditambah", value: result.added },
              { label: "Diubah", value: result.changed },
              { label: "Dinonaktifkan", value: result.deactivated },
              { label: "Dihapus", value: result.deleted },
              { label: "Error", value: result.errorCount },
            ].map((item) => (
              <div key={item.label} className="bg-[#FFFFFF] p-[12px]">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                  {item.label}
                </div>
                <div className="text-[20px] tabular-nums text-[#0F0E12]">{item.value}</div>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-[12px] max-h-[200px] overflow-auto text-[12px] text-[#B00020]">
              {result.errors.map((item, index) => (
                <li key={index}>
                  baris {item.rowNumber ?? "-"}: {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DiffSection<T>({
  title,
  empty,
  items,
  render,
  head,
}: {
  title: string;
  empty: string;
  items: T[];
  render: (item: T, index: number) => React.ReactNode;
  head: string[];
}) {
  const [open, setOpen] = useState(items.length > 0 && items.length <= 20);

  return (
    <div className={`${cardClass} mb-[16px]`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-[16px] text-left hover:bg-[#F5F5F5] transition-colors"
      >
        <span className="text-[13px] uppercase tracking-[0.08em] text-[#0F0E12]">{title}</span>
        <span className="text-[13px] text-[#767676]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-[#D6D6D6] overflow-x-auto">
          {items.length === 0 ? (
            <div className="p-[16px] text-[13px] text-[#767676]">{empty}</div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="border-b border-[#D6D6D6]">
                <tr>
                  {head.map((label) => (
                    <th key={label} className={tableHeadClass}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6D6D6]">
                {items.slice(0, 200).map((item, index) => render(item, index))}
              </tbody>
            </table>
          )}
          {items.length > 200 && (
            <div className="p-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              hanya 200 baris pertama ditampilkan (total {items.length})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
