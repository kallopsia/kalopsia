"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "info";

type Toast = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam ToastProvider.");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-[16px] right-[16px] z-50 flex flex-col gap-[8px] w-[calc(100%-32px)] max-w-[360px]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={[
              "border px-[16px] py-[12px] text-[12px] leading-[1.5] bg-[#FFFFFF]",
              toast.tone === "success"
                ? "border-[#1B7F3B] text-[#1B7F3B]"
                : toast.tone === "error"
                ? "border-[#B00020] text-[#B00020]"
                : "border-[#0F0E12] text-[#0F0E12]",
            ].join(" ")}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
