"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import {
  badgeClass,
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  tableCellClass,
  tableHeadClass,
} from "./styles";
import { photoUrl } from "@/lib/photo-url";

type Summary = {
  skusMapped: number;
  assetsRead: number;
  foldersMapped: number;
  foldersEmpty: number;
  foldersOrphan: number;
  foldersExcluded: number;
  skusToWrite: number;
  skusFilled: number;
  skusUpdated: number;
  skusUnchanged: number;
  skusProtected: number;
  skusWithoutPhotos: number;
  skusStalePhotos: number;
  photosToWrite: number;
  photosRemoved: number;
  filesSkipped: number;
  filesTruncated: number;
};

type Report = {
  prefix: string;
  overwrite: boolean;
  warnings: string[];
  summary: Summary;
  writePlans: {
    kode_barang: string;
    folder: string;
    action: string;
    removed: number;
    photos: { publicId: string; fileName: string; posisi: number }[];
  }[];
  emptyFolders: { folder: string; existsInCloudinary: boolean; skuCount: number }[];
  stalePhotos: { kode_barang: string; folder: string; count: number }[];
  orphanFolders: string[];
  excludedFolders: string[];
  skippedFiles: { folder: string; fileName: string; reason: string }[];
  truncatedFiles: { folder: string; fileName: string }[];
  listsTrimmed: boolean;
};

type ApplyResult = { products: number; photos: number; removed: number };

export default function PhotoSyncPanel({ defaultPrefix }: { defaultPrefix: string }) {
  const router = useRouter();
  const toast = useToast();

  const [prefix, setPrefix] = useState(defaultPrefix);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState<"" | "preview" | "apply">("");
  const [report, setReport] = useState<Report | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState("");

  const send = async (mode: "preview" | "apply") => {
    setBusy(mode);
    setError("");
    try {
      const response = await fetch("/api/admin/photos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prefix,
          overwrite,
          ...(mode === "apply" ? { confirm: true } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Sinkronisasi gagal diproses server.");
        toast.push(data?.error || "Sinkronisasi gagal.", "error");
        return;
      }
      setReport(data.report as Report);
      if (mode === "apply") {
        setResult(data.result as ApplyResult);
        toast.push(
          `Foto tersimpan: ${data.result.photos} baris untuk ${data.result.products} SKU.`,
          "success"
        );
        router.refresh();
      } else {
        setResult(null);
        toast.push("Dry-run selesai. Belum ada yang disimpan.", "info");
      }
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
      toast.push("Jaringan bermasalah.", "error");
    } finally {
      setBusy("");
    }
  };

  const s = report?.summary;

  return (
    <div className="w-full flex flex-col gap-[16px]">
      <div className={`${cardClass} p-[24px]`}>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
          sinkron dari cloudinary
        </div>
        <p className="text-[13px] leading-[1.6] text-[#0F0E12] mb-[16px] max-w-[720px]">
          Foto dibaca dari Cloudinary Admin API (hanya di server) lalu dicocokkan per folder.
          Dry-run wajib diperiksa dulu; menyimpan hanya terjadi lewat tombol &quot;simpan hasil&quot;.
          Foto yang diatur manual di halaman produk tidak pernah ditimpa.
        </p>

        <div className="flex flex-wrap items-end gap-[12px]">
          <label className="min-w-[220px]">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676] block mb-[4px]">
              prefix folder
            </span>
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className={inputClass}
              placeholder="laptop"
            />
          </label>
          <label className="flex items-center gap-[8px] text-[13px] text-[#0F0E12] pb-[8px]">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
            />
            timpa SKU yang sudah punya foto manual
          </label>
          <button
            type="button"
            onClick={() => void send("preview")}
            disabled={busy !== ""}
            className={secondaryButtonClass}
          >
            {busy === "preview" ? "membaca cloudinary..." : "jalankan dry-run"}
          </button>
          <button
            type="button"
            onClick={() => void send("apply")}
            disabled={busy !== "" || !report || report.summary.skusToWrite === 0}
            className={primaryButtonClass}
          >
            {busy === "apply" ? "menyimpan..." : "simpan hasil"}
          </button>
        </div>
        {report && report.summary.skusToWrite === 0 && (
          <div className="mt-[12px] text-[12px] text-[#767676]">
            Tidak ada yang perlu disimpan — hasil dry-run sudah sama dengan database.
          </div>
        )}
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] text-[12px] leading-[1.5] text-[#B00020]">
          {error}
        </div>
      )}

      {result && (
        <div className={`${cardClass} p-[16px]`}>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
            hasil simpan
          </div>
          <div className="text-[13px] text-[#0F0E12]">
            {result.products} SKU diperbarui · {result.photos} baris foto ditulis ·{" "}
            {result.removed} baris sinkron lama dihapus
          </div>
        </div>
      )}

      {report && s && (
        <>
          {report.warnings.length > 0 && (
            <ul className="text-[12px] text-[#767676]">
              {report.warnings.map((warning) => (
                <li key={warning}>! {warning}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6]">
            {[
              { label: "SKU terpemetaan", value: s.skusMapped },
              { label: "Aset terbaca", value: s.assetsRead },
              { label: "Akan disimpan", value: s.skusToWrite },
              { label: "Foto ditulis", value: s.photosToWrite },
              { label: "Sudah cocok", value: s.skusUnchanged },
              { label: "Tanpa foto", value: s.skusWithoutPhotos },
            ].map((item) => (
              <div key={item.label} className="bg-[#FFFFFF] p-[12px]">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                  {item.label}
                </div>
                <div className="text-[20px] tabular-nums text-[#0F0E12]">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
            {`prefix ${report.prefix} // dilindungi foto manual ${s.skusProtected} // folder kosong ${s.foldersEmpty} // yatim ${s.foldersOrphan} // brand nonaktif ${s.foldersExcluded} // berkas dilewati ${s.filesSkipped}`}
          </div>

          <Section
            title={`(a) SKU yang akan terisi foto (${report.writePlans.length})`}
            count={report.writePlans.length}
            empty="Tidak ada SKU yang berubah. Jalankan lagi setelah foto diunggah ke Cloudinary."
          >
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="border-b border-[#D6D6D6]">
                <tr>
                  {["Kode barang", "Folder", "Aksi", "Foto"].map((label) => (
                    <th key={label} className={tableHeadClass}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6D6D6]">
                {report.writePlans.slice(0, 100).map((plan) => (
                  <tr key={plan.kode_barang}>
                    <td className={`${tableCellClass} break-all`}>{plan.kode_barang}</td>
                    <td className={`${tableCellClass} break-all`}>
                      {plan.folder}
                      {plan.removed > 0 && (
                        <span className="ml-[8px] text-[11px] text-[#B00020]">
                          −{plan.removed} lama
                        </span>
                      )}
                    </td>
                    <td className={tableCellClass}>
                      <span className={badgeClass(plan.action === "update" ? "blue" : "green")}>
                        {plan.action}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <div className="flex flex-wrap gap-[6px]">
                        {plan.photos.map((photo) => {
                          const src = photoUrl(photo.publicId);
                          if (!src) return null;
                          return (
                            <Image
                              key={photo.publicId}
                              src={src}
                              alt={photo.fileName}
                              width={56}
                              height={56}
                              loading="lazy"
                              className="w-[56px] h-[56px] object-cover border border-[#D6D6D6]"
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section
            title={`(b) folder kosong / belum ada di Cloudinary (${report.emptyFolders.length})`}
            count={report.emptyFolders.length}
            empty="Semua folder pemetaan punya foto."
          >
            <ListTable
              head={["Folder", "Status", "SKU"]}
              rows={report.emptyFolders.slice(0, 100).map((folder) => [
                folder.folder,
                folder.existsInCloudinary ? "folder ada, isinya kosong" : "folder belum dibuat",
                String(folder.skuCount),
              ])}
            />
          </Section>

          <Section
            title={`foto sinkron lama yang tetap tersimpan (${report.stalePhotos.length})`}
            count={report.stalePhotos.length}
            empty="Tidak ada foto sinkron yang tertinggal."
          >
            <ListTable
              head={["Kode barang", "Folder", "Baris"]}
              rows={report.stalePhotos
                .slice(0, 100)
                .map((item) => [item.kode_barang, item.folder, String(item.count)])}
            />
            <div className="p-[12px] text-[12px] text-[#767676] border-t border-[#D6D6D6]">
              Baris ini tidak dihapus otomatis. Hapus manual dari halaman produk bila folder
              memang pindah.
            </div>
          </Section>

          <Section
            title={`(c) folder berisi foto tanpa pemetaan (${report.orphanFolders.length})`}
            count={report.orphanFolders.length}
            empty="Tidak ada folder yatim."
          >
            <ListTable
              head={["Folder cloudinary"]}
              rows={report.orphanFolders.slice(0, 100).map((folder) => [folder])}
            />
          </Section>

          <Section
            title={`folder brand nonaktif yang diabaikan (${report.excludedFolders.length})`}
            count={report.excludedFolders.length}
            empty="Tidak ada folder brand nonaktif."
          >
            <ListTable
              head={["Folder cloudinary"]}
              rows={report.excludedFolders.slice(0, 100).map((folder) => [folder])}
            />
          </Section>

          <Section
            title={`(d) berkas non-gambar dilewati (${report.skippedFiles.length})`}
            count={report.skippedFiles.length}
            empty="Semua berkas di folder pemetaan adalah gambar yang bisa dipakai."
          >
            <ListTable
              head={["Berkas", "Alasan"]}
              rows={report.skippedFiles
                .slice(0, 100)
                .map((file) => [`${file.folder}/${file.fileName}`, file.reason])}
            />
            {report.truncatedFiles.length > 0 && (
              <div className="p-[12px] text-[12px] text-[#767676] border-t border-[#D6D6D6]">
                {`${report.truncatedFiles.length} berkas tidak dipakai karena melebihi batas 24 foto per produk.`}
              </div>
            )}
          </Section>

          {report.listsTrimmed && (
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              daftar di atas dipotong ke 300 baris; pakai script dry-run untuk laporan lengkap
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`${cardClass}`}>
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
          {count === 0 ? (
            <div className="p-[16px] text-[13px] text-[#767676]">{empty}</div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

function ListTable({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full min-w-[560px] border-collapse">
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
        {rows.map((cells, index) => (
          <tr key={`${index}-${cells[0]}`}>
            {cells.map((cell, cellIndex) => (
              <td
                key={`${index}-${cellIndex}`}
                className={`${tableCellClass} ${cellIndex === 0 ? "break-all" : ""}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
