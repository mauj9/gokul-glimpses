"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Variant = "info" | "error" | "success";
type Toast = { id: number; message: string; variant: Variant };

const ToastContext = createContext<(message: string, variant?: Variant) => void>(
  () => {},
);

/** Call `toast("message", "error")` from any client component. */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, variant: Variant = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      3500,
    );
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto max-w-sm rounded-chubby px-4 py-2 text-sm font-semibold shadow-chubby-lg ${
              t.variant === "error"
                ? "bg-danger text-white"
                : t.variant === "success"
                  ? "bg-pistachio text-white"
                  : "bg-peacock text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
