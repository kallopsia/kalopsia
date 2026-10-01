"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import {
  badgeClass,
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  smallDangerButtonClass,
  smallSecondaryButtonClass,
  tableCellClass,
  tableHeadClass,
} from "./styles";

type MappingRow = { kode_barang: string; folder: string; sumber?: string | null };

type Report = {
  filename: string;
  sheetName: string;
  totalRows: number;
  saved: number;
  folderCount: number;
  matchedProducts: number;
  unknownSkus: { kode_barang: string; folder: string }[];
  issues: { rowNumber: number | null; message: string }[];
  excludedCount: number;
  duplicateCount: number;
  warnings: string[];
};

type Payload = {
  rows: MappingRow[];
  stored: number;
  folders: number;
  manual: number;
  excluded: number;
};

const MAX_BYTES = 10 * 1024 * 1024;

export default function PhotoMappingPanel({
  prefix,
  initial,
}: {
  prefix: string;
  initial: Payload | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [payload, setPayload] = useState<Payload | null>(initial);
  const [loadError, setLoadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "apply" | "row">("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ kode: string; folder: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newSku, setNewSku] = useState({ kode: "", folder: "" });

  const loadRows = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/photos/mapping", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoadError(data?.error || "Pemetaan belum bisa dibaca.");
        return;
      }
      setPayload(data as Payload);
      setLoadError("");
    } catch {
      setLoadError("Jaringan bermasalah saat membaca pemetaan.");
    }
  }, []);

  useEffect(() => {
    setPayload(initial);
  }, [initial]);

  const send = async (mode: "preview" | "apply") => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);

    setBusy(mode);
    setError("");
    try {
      const response = await fetch("/api/admin/photos/mapping", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Berkas pemetaan gagal diproses.");
        toast.push(data?.error || "Berkas pemetaan gagal.", "error");
        return;
      }
      setReport(data.report as Report);
      if (mode === "apply") {
        toast.push(`Pemetaan tersimpan: ${data.saved} SKU.`, "success");
        await loadRows();
        router.refresh();
      } else {
        toast.push("Pratinjau pemetaan siap diperiksa.", "success");
      }
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
      toast.push("Jaringan bermasalah.", "error");
    } finally {
      setBusy("");
    }
  };

  const saveOverride = async (kode: string, folder: string | null) => {
    setBusy("row");
    setError("");
    try {
      const response = await fetch("/api/admin/photos/mapping/sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode_barang: kode,
          folder,
          ...(folder === null ? { action: "delete" } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Gagal menyimpan folder.");
        toast.push(data?.error || "Gagal menyimpan folder.", "error");
        return;
      }
      toast.push(folder === null ? `Pemetaan ${kode} dihapus.` : `Folder ${kode} disimpan.`, "success");
      setEditing(null);
      await loadRows();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setBusy("");
    }
  };

  const acceptFile = (candidate: File | null | undefined) => {
    if (!candidate) return;
    if (!/\.(xlsx|csv)$/i.test(candidate.name)) {
      setError("Format harus .xlsx (sheet \"Pemetaan SKU\") atau .csv (kodebarang,url_foto).");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError("Ukuran berkas maksimal 10 MB.");
      return;
    }
    setError("");
    setReport(null);
    setFile(candidate);
  };

  const rows = useMemo(() => payload?.rows ?? [], [payload]);
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rows.slice(0, 200);
    return rows
      .filter(
        (row) =>
          row.kode_barang.toLowerCase().includes(needle) || row.folder.toLowerCase().includes(needle)
      )
      .slice(0, 200);
  }, [rows, filter]);

  return (
    <div className="w-full flex flex-col gap-[16px]">
      <div className={`${cardClass} p-[24px]`}>
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
          unggah pemetaan sku → folder
        </div>
        <p className="text-[13px] leading-[1.6] text-[#0F0E12] mb-[16px] max-w-[720px]">
          Sumber kebenaran: sheet <strong>Pemetaan SKU</strong> (kolom A KODEBARANG, kolom B Nama
          Folder), atau CSV cadangan berheader <code>kodebarang,url_foto</code>. Nama folder tidak
          pernah ditebak dari kode barang. Satu folder boleh dipakai banyak SKU.
        </p>

        <div className="flex flex-wrap items-center gap-[12px]">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />
          <button type="button" onClick={() => inputRef.current?.click()} className={secondaryButtonClass}>
            pilih berkas
          </button>
          {file && (
            <span className="text-[12px] text-[#0F0E12]">
              {file.name} <span className="text-[#767676]">({Math.round(file.size / 1024)} KB)</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => void send("preview")}
            disabled={!file || busy !== ""}
            className={secondaryButtonClass}
          >
            {busy === "preview" ? "memeriksa..." : "periksa dulu"}
          </button>
          <button
            type="button"
            onClick={() => void send("apply")}
            disabled={!file || busy !== ""}
            className={primaryButtonClass}
          >
            {busy === "apply" ? "menyimpan..." : "simpan pemetaan"}
          </button>
        </div>

        {report && (
          <div className="mt-[16px] border-t border-[#D6D6D6] pt-[16px]">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6]">
              {[
                { label: "Baris terbaca", value: report.totalRows },
                { label: "Akan disimpan", value: report.saved },
                { label: "Folder unik", value: report.folderCount },
                { label: "SKU ada di DB", value: report.matchedProducts },
                { label: "SKU tak dikenal", value: report.unknownSkus.length },
                { label: "Brand nonaktif", value: report.excludedCount },
              ].map((item) => (
                <div key={item.label} className="bg-[#FFFFFF] p-[12px]">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                    {item.label}
                  </div>
                  <div className="text-[20px] tabular-nums text-[#0F0E12]">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-[8px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              {`sheet ${report.sheetName} // duplikat timpa-belakang ${report.duplicateCount}`}
            </div>
            {report.warnings.length > 0 && (
              <ul className="mt-[8px] text-[12px] text-[#767676]">
                {report.warnings.map((warning) => (
                  <li key={warning}>! {warning}</li>
                ))}
              </ul>
            )}
            {report.issues.length > 0 && (
              <ul className="mt-[8px] max-h-[160px] overflow-auto text-[12px] text-[#B00020]">
                {report.issues.slice(0, 50).map((issue, index) => (
                  <li key={`${issue.rowNumber}-${index}`}>
                    baris {issue.rowNumber ?? "-"}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
            {report.unknownSkus.length > 0 && (
              <div className="mt-[8px] text-[12px] text-[#767676]">
                SKU di berkas tapi belum ada di katalog (tetap disimpan, terpakai nanti):{" "}
                {report.unknownSkus
                  .slice(0, 20)
                  .map((row) => row.kode_barang)
                  .join(", ")}
                {report.unknownSkus.length > 20 ? ` … +${report.unknownSkus.length - 20}` : ""}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] text-[12px] leading-[1.5] text-[#B00020]">
          {error}
        </div>
      )}
      {loadError && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] text-[12px] leading-[1.5] text-[#B00020]">
          {loadError}
        </div>
      )}

      {payload && (
        <div className={`${cardClass}`}>
          <div className="p-[16px] flex flex-wrap items-center justify-between gap-[12px] border-b border-[#D6D6D6]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                pemetaan tersimpan
              </div>
              <div className="text-[13px] text-[#0F0E12]">
                {payload.stored} SKU · {payload.folders} folder · {payload.manual} override manual
                {payload.excluded > 0 ? ` · ${payload.excluded} baris brand nonaktif` : ""}
              </div>
            </div>
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="cari kode atau folder"
              className={`${inputClass} max-w-[260px]`}
            />
          </div>

          <div className="overflow-x-auto">
            {rows.length === 0 ? (
              <div className="p-[16px] text-[13px] text-[#767676]">
                Belum ada pemetaan. Unggah berkas di atas, atau tambahkan folder per SKU di sini.
              </div>
            ) : (
              <table className="w-full min-w-[680px] border-collapse">
                <thead className="border-b border-[#D6D6D6]">
                  <tr>
                    {["Kode barang", "Folder cloudinary", "Sumber", ""].map((label) => (
                      <th key={label} className={tableHeadClass}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6D6D6]">
                  {shown.map((row) => {
                    const isEditing = editing?.kode === row.kode_barang;
                    return (
                      <tr key={row.kode_barang}>
                        <td className={`${tableCellClass} break-all`}>{row.kode_barang}</td>
                        <td className={tableCellClass}>
                          {isEditing ? (
                            <input
                              value={editing.folder}
                              onChange={(event) =>
                                setEditing({ kode: row.kode_barang, folder: event.target.value })
                              }
                              placeholder={`mis. ${prefix}/PR-LAP-AC-...`}
                              className={inputClass}
                            />
                          ) : (
                            <span className="break-all">{row.folder}</span>
                          )}
                        </td>
                        <td className={tableCellClass}>
                          <span className={badgeClass(row.sumber === "manual" ? "blue" : "grey")}>
                            {row.sumber || "xlsx"}
                          </span>
                        </td>
                        <td className={`${tableCellClass} whitespace-nowrap`}>
                          {isEditing ? (
                            <div className="flex gap-[8px]">
                              <button
                                type="button"
                                disabled={busy !== "" || !editing.folder.trim()}
                                onClick={() => void saveOverride(row.kode_barang, editing.folder.trim())}
                                className={smallSecondaryButtonClass}
                              >
                                simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className={smallSecondaryButtonClass}
                              >
                                batal
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-[8px]">
                              <button
                                type="button"
                                disabled={busy !== ""}
                                onClick={() => setEditing({ kode: row.kode_barang, folder: row.folder })}
                                className={smallSecondaryButtonClass}
                              >
                                ubah
                              </button>
                              <button
                                type="button"
                                disabled={busy !== ""}
                                onClick={() => void saveOverride(row.kode_barang, null)}
                                className={smallDangerButtonClass}
                              >
                                hapus
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {rows.length > shown.length && (
              <div className="p-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676] border-t border-[#D6D6D6]">
                {`menampilkan ${shown.length} dari ${rows.length} baris — pakai pencarian untuk sisanya`}
              </div>
            )}
          </div>

          <div className="p-[16px] border-t border-[#D6D6D6] flex flex-wrap gap-[12px] items-center">
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => {
                setEditing(null);
                setShowNew(true);
              }}
              className={secondaryButtonClass}
            >
              tambah sku manual
            </button>
            <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              override disimpan sebagai sumber &quot;manual&quot;
            </span>
          </div>

          {showNew && (
            <div className="p-[16px] border-t border-[#D6D6D6] flex flex-wrap gap-[12px] items-end">
              <label className="flex-1 min-w-[220px]">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676] block mb-[4px]">
                  kode barang
                </span>
                <input
                  value={newSku.kode}
                  onChange={(event) => setNewSku({ ...newSku, kode: event.target.value })}
                  placeholder="mis. AL14-32P"
                  className={inputClass}
                />
              </label>
              <label className="flex-1 min-w-[260px]">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676] block mb-[4px]">
                  nama folder
                </span>
                <input
                  value={newSku.folder}
                  onChange={(event) => setNewSku({ ...newSku, folder: event.target.value })}
                  placeholder="mis. PR-LAP-AC-AL14-32P"
                  className={inputClass}
                />
              </label>
              <button
                type="button"
                disabled={busy !== "" || !newSku.kode.trim() || !newSku.folder.trim()}
                onClick={() =>
                  void saveOverride(newSku.kode.trim(), newSku.folder.trim()).then(() => {
                    setNewSku({ kode: "", folder: "" });
                    setShowNew(false);
                  })
                }
                className={primaryButtonClass}
              >
                simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNew(false);
                  setNewSku({ kode: "", folder: "" });
                }}
                className={secondaryButtonClass}
              >
                batal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
