"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

const MAX_SECONDS = 30; // PRD 4.3 hard cap

export function AudioRecorder({
  onAudio,
}: {
  onAudio: (blob: Blob | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [echoUrl, setEchoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (echoUrl) URL.revokeObjectURL(echoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        stream.getTracks().forEach((t) => t.stop());
        const url = URL.createObjectURL(blob);
        setEchoUrl(url);
        onAudio(blob);
      };

      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone not available — check permissions.");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  function discard() {
    if (echoUrl) URL.revokeObjectURL(echoUrl);
    setEchoUrl(null);
    setSeconds(0);
    onAudio(null);
  }

  if (echoUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">🪶</span>
        <audio src={echoUrl} controls className="h-10 min-w-0 flex-1" />
        <Button
          variant="ghost"
          type="button"
          onClick={discard}
          className="!min-h-9 !px-2 text-sm text-danger"
        >
          ✕
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-3 rounded-chubby bg-peacock-soft p-3">
        <span className="animate-feather text-3xl">🪶</span>
        <div className="flex h-8 flex-1 items-center gap-1" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="waveform-bar w-1.5 rounded-full bg-peacock"
              style={{
                height: "100%",
                animationDelay: `${(i % 5) * 0.12}s`,
              }}
            />
          ))}
        </div>
        <span className="font-display font-bold text-peacock-deep">
          {MAX_SECONDS - seconds}s
        </span>
        <Button
          variant="secondary"
          type="button"
          onClick={stop}
          className="!min-h-9 !px-3 text-sm"
        >
          ⏹ Done
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="soft" type="button" onClick={start}>
        🎙️ Record Audio <span className="text-xs">(up to 30s)</span>
      </Button>
      {error && (
        <p className="mt-1 text-sm font-semibold text-danger">{error}</p>
      )}
    </div>
  );
}
