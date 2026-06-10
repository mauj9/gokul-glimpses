"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarEmoji } from "@/lib/avatars";

export type Slide = {
  id: string;
  childName: string;
  childAge: number;
  avatar: string;
  spaceName: string;
  text: string;
  tags: string[];
  images: string[];
  video: string | null;
  echo: string | null;
  createdAt: string;
};

const IMAGE_SECONDS = 6;

/**
 * Fullscreen slideshow. Image slides hold for IMAGE_SECONDS (or the Echo's
 * duration); video slides advance when the video ends. Next slides' media is
 * prefetched while the current one plays (PRD 4.6 smart transitions).
 */
export function Player({
  slides,
  exitHref,
}: {
  slides: Slide[];
  exitHref: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[index];

  const advance = useCallback(
    (delta: 1 | -1 = 1) => {
      setImageIdx(0);
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return 0;
        if (next >= slides.length) {
          router.push(exitHref);
          return i;
        }
        return next;
      });
    },
    [slides.length, router, exitHref],
  );

  // Prefetch the next two slides' media.
  useEffect(() => {
    for (const next of slides.slice(index + 1, index + 3)) {
      next.images.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
      if (next.echo) {
        const a = new Audio();
        a.preload = "auto";
        a.src = next.echo;
      }
    }
  }, [index, slides]);

  // Drive image-slide timing (echo-aware) + image cycling.
  useEffect(() => {
    if (!slide || paused || slide.video) return;

    const audio = audioRef.current;
    let holdMs = IMAGE_SECONDS * 1000;
    if (slide.images.length > 1) {
      holdMs = slide.images.length * 4000;
    }

    if (slide.echo && audio) {
      audio.src = slide.echo;
      audio.play().catch(() => {});
      const onEnd = () => advance(1);
      // Whichever is longer: echo or the image cycle.
      const fallback = setTimeout(onEnd, Math.max(holdMs, 35000));
      audio.onended = () => {
        clearTimeout(fallback);
        onEnd();
      };
      return () => {
        clearTimeout(fallback);
        audio.onended = null;
        audio.pause();
      };
    }

    timerRef.current = setTimeout(() => advance(1), holdMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slide, paused, advance]);

  // Cycle through multiple images within a slide.
  useEffect(() => {
    if (!slide || paused || slide.images.length <= 1) return;
    const t = setInterval(
      () => setImageIdx((i) => (i + 1) % slide.images.length),
      4000,
    );
    return () => clearInterval(t);
  }, [slide, paused]);

  // Pause/resume media with state.
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (paused) {
      video?.pause();
      audio?.pause();
    } else {
      video?.play().catch(() => {});
      if (audio?.src && audio.paused && !slide?.video) {
        audio.play().catch(() => {});
      }
    }
  }, [paused, slide]);

  if (!slide) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink text-white">
        <p>Nothing to play 🌼</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink">
      {/* progress */}
      <div className="flex gap-1 p-2">
        {slides.map((s, i) => (
          <span
            key={s.id}
            className={`h-1 flex-1 rounded-full ${
              i <= index ? "bg-marigold" : "bg-white/25"
            }`}
          />
        ))}
      </div>

      {/* top bar */}
      <div className="flex items-center justify-between px-3 pb-1">
        <span className="text-xs text-white/70">
          {index + 1} / {slides.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume" : "Pause"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
          >
            {paused ? "▶" : "⏸"}
          </button>
          <button
            type="button"
            onClick={() => router.push(exitHref)}
            aria-label="Close replay"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* media area with tap zones */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {slide.video ? (
          <video
            ref={videoRef}
            key={slide.id}
            src={slide.video}
            autoPlay
            playsInline
            onEnded={() => advance(1)}
            className="max-h-full max-w-full"
          />
        ) : slide.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${slide.id}-${imageIdx}`}
            src={slide.images[imageIdx]}
            alt={`${slide.childName}'s glimpse`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="max-w-md px-8 text-center">
            <p className="mb-4 text-5xl">{avatarEmoji(slide.avatar)}</p>
            <p className="font-display text-2xl font-bold text-mango">
              “{slide.text}”
            </p>
          </div>
        )}

        <button
          type="button"
          aria-label="Previous glimpse"
          onClick={() => advance(-1)}
          className="absolute inset-y-0 left-0 w-1/4"
        />
        <button
          type="button"
          aria-label="Next glimpse"
          onClick={() => advance(1)}
          className="absolute inset-y-0 right-0 w-1/4"
        />
      </div>

      {/* child banner (PRD: name, age, shakha alongside the glimpse) */}
      <div className="bg-gradient-to-t from-black/90 to-transparent p-4 pb-6">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mango-soft text-2xl">
            {avatarEmoji(slide.avatar)}
          </span>
          <div className="min-w-0 flex-1 text-white">
            <p className="font-display text-lg font-bold">
              {slide.childName}, {slide.childAge}
            </p>
            <p className="truncate text-sm text-white/80">{slide.spaceName}</p>
            {slide.text && (slide.images.length > 0 || slide.video) && (
              <p className="mt-1 line-clamp-2 text-sm text-white/90">
                {slide.text}
              </p>
            )}
            {slide.tags.length > 0 && (
              <p className="mt-1 truncate text-xs text-pistachio-soft">
                {slide.tags.join("  ")}
              </p>
            )}
          </div>
          {slide.echo && !slide.video && (
            <span className="animate-feather text-2xl" title="Echo playing">
              🪶
            </span>
          )}
        </div>
      </div>

      <audio ref={audioRef} hidden />
    </div>
  );
}
