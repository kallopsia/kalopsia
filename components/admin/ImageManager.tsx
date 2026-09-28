"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useToast } from "./Toast";
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  smallDangerButtonClass,
  smallSecondaryButtonClass,
} from "./styles";

export type CloudinaryConfig = {
  cloudName: string;
  uploadPreset: string;
  signedEnabled: boolean;
  configured: boolean;
};

interface ImageManagerProps {
  value: string[];
  onChange: (urls: string[]) => void;
  config: CloudinaryConfig;
}

const MAX_IMAGES = 12;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const UPLOAD_ENDPOINT = "https://api.cloudinary.com/v1_1";

function validateCloudinaryUrl(url: string, cloudName: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "URL tidak valid.";
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
    return "URL gambar harus https://res.cloudinary.com/...";
  }
  if (cloudName && !parsed.pathname.startsWith(`/${cloudName}/`)) {
    return `URL gambar harus berada di cloud "${cloudName}".`;
  }
  return null;
}

export default function ImageManager({ value, onChange, config }: ImageManagerProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const images = value || [];

  const addUrl = (url: string) => {
    const trimmed = url.trim();
    const problem = validateCloudinaryUrl(trimmed, config.cloudName);
    if (problem) {
      toast.push(problem, "error");
      return false;
    }
    if (images.includes(trimmed)) {
      toast.push("URL itu sudah ada di daftar gambar.", "info");
      return false;
    }
    if (images.length >= MAX_IMAGES) {
      toast.push(`Maksimal ${MAX_IMAGES} gambar per produk.`, "error");
      return false;
    }
    onChange([...images, trimmed]);
    return true;
  };

  const handleManualAdd = () => {
    if (!manualUrl.trim()) return;
    if (addUrl(manualUrl)) {
      setManualUrl("");
      toast.push("URL gambar ditambahkan.", "success");
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);

    if (config.uploadPreset) {
      form.append("upload_preset", config.uploadPreset);
    } else {
      const signResponse = await fetch("/api/cloudinary/sign", { method: "POST" });
      const signPayload = await signResponse.json().catch(() => ({}));
      if (!signResponse.ok) {
        throw new Error(signPayload?.error || "Gagal meminta signature Cloudinary.");
      }
      form.append("api_key", signPayload.apiKey);
      form.append("timestamp", String(signPayload.timestamp));
      form.append("signature", signPayload.signature);
      form.append("folder", signPayload.folder || "notebook-archive");
    }

    const response = await fetch(`${UPLOAD_ENDPOINT}/${config.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || "Upload ke Cloudinary gagal.");
    }
    return String(payload.secure_url);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!config.configured || !config.cloudName) {
      toast.push(
        "Cloudinary belum dikonfigurasi. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + preset atau API key/secret.",
        "error"
      );
      return;
    }

    const accepted = Array.from(files).filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.push(`${file.name}: format tidak didukung (jpg/png/webp/avif).`, "error");
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.push(`${file.name}: ukuran maksimal 8 MB.`, "error");
        return false;
      }
      return true;
    });

    if (accepted.length === 0) return;

    setUploading(true);
    const next = [...images];
    try {
      for (const file of accepted) {
        if (next.length >= MAX_IMAGES) {
          toast.push(`Maksimal ${MAX_IMAGES} gambar, sisa file dilewati.`, "info");
          break;
        }
        const url = await uploadFile(file);
        if (!next.includes(url)) next.push(url);
      }
      onChange(next);
      toast.push(`${accepted.length} gambar berhasil diunggah.`, "success");
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Upload gagal.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const makeMain = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
    toast.push("Gambar utama diperbarui (indeks pertama).", "success");
  };

  const removeAt = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    toast.push("URL gambar dihapus dari produk (file di Cloudinary tetap ada).", "info");
  };

  return (
    <div>
      <div className={labelClass}>Gambar produk (urut; pertama = gambar utama)</div>

      {!config.configured && (
        <div className="border border-[#D6D6D6] bg-[#F5F5F5] p-[12px] mb-[12px] text-[12px] leading-[1.5] text-[#767676]">
          Cloudinary belum dikonfigurasi di server. Set <code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code>{" "}
          lalu salah satu dari <code>NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</code> (unsigned) atau{" "}
          <code>CLOUDINARY_API_KEY</code> + <code>CLOUDINARY_API_SECRET</code> (signed). Menempel URL
          manual tetap bisa dipakai.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[8px] mb-[12px]">
        {images.length === 0 && (
          <div className="col-span-full border border-dashed border-[#D6D6D6] bg-[#F5F5F5] p-[16px] text-[12px] text-[#767676]">
            Belum ada gambar. Toko akan menampilkan placeholder otomatis.
          </div>
        )}
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="border border-[#D6D6D6] bg-[#FFFFFF]">
            <div className="relative aspect-[4/3] bg-[#F5F5F5]">
              <Image src={url} alt={`Gambar ${index + 1}`} fill sizes="160px" className="object-contain p-[6px]" />
              {index === 0 && (
                <span className="absolute left-[4px] top-[4px] border border-[#0071BB] bg-[#FFFFFF] px-[6px] py-[1px] text-[10px] uppercase tracking-[0.08em] text-[#0071BB]">
                  utama
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-[4px] p-[6px]">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className={smallSecondaryButtonClass}
                aria-label="Geser ke kiri"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === images.length - 1}
                className={smallSecondaryButtonClass}
                aria-label="Geser ke kanan"
              >
                →
              </button>
              <button
                type="button"
                onClick={() => makeMain(index)}
                disabled={index === 0}
                className={smallSecondaryButtonClass}
              >
                utama
              </button>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className={smallDangerButtonClass}
                aria-label="Hapus gambar"
              >
                hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-[8px] sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          className="text-[12px] text-[#0F0E12] file:mr-[8px] file:border file:border-[#D6D6D6] file:bg-[#FFFFFF] file:px-[12px] file:py-[8px] file:text-[11px] file:uppercase file:tracking-[0.08em] file:text-[#0F0E12]"
        />
        <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          {uploading ? "mengunggah..." : `jpg/png/webp/avif, maks 8 MB, total ${images.length}/${MAX_IMAGES}`}
        </span>
      </div>

      <div className="mt-[12px] flex flex-col gap-[8px] sm:flex-row">
        <input
          type="url"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder={`https://res.cloudinary.com/${config.cloudName || "<cloud>"}/image/upload/...`}
          className={inputClass}
          aria-label="Tempel URL gambar Cloudinary"
        />
        <button type="button" onClick={handleManualAdd} className={secondaryButtonClass}>
          tempel url
        </button>
      </div>
    </div>
  );
}
