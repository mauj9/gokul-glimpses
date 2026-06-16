"use client";

import { useEffect, useState } from "react";

/** Fullscreen image viewer with prev/next + keyboard/escape support. */
export function ImageLightbox({
  images,
  startIndex,
  alt,
  onClose,
}: {
  images: string[];
  startIndex: number;
  alt: string;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const count = images.length;
  const go = (delta: number) => setI((n) => (n + delta + count) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
      >
        ✕
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[i]}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full rounded-chubby object-contain"
      />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white"
          >
            ›
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-chubby bg-white/15 px-3 py-1 text-sm font-semibold text-white">
            {i + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}
