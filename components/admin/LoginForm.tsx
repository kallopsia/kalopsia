"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass, primaryButtonClass } from "./styles";
import { useToast } from "./Toast";

interface LoginFormProps {
  nextPath: string;
}

export default function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const safeNext = nextPath.startsWith("/admin") ? nextPath : "/admin";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "Gagal masuk. Periksa email dan password.");
        setLoading(false);
        return;
      }
      toast.push("Berhasil masuk.", "success");
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError("Jaringan bermasalah. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-[#D6D6D6] bg-[#FFFFFF] p-[24px]">
      <div className="mb-[16px]">
        <label className={labelClass} htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          placeholder="admin@toko.com"
        />
      </div>

      <div className="mb-[16px]">
        <label className={labelClass} htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className={`${primaryButtonClass} w-full`}>
        {loading ? "memproses..." : "masuk"}
      </button>
    </form>
  );
}
