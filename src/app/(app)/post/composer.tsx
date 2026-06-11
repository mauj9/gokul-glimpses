"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { Button, Card, Input, Label } from "@/components/ui";
import { avatarEmoji } from "@/lib/avatars";
import { normalizeTag } from "@/lib/slug";
import { EchoRecorder } from "./echo-recorder";
import { createPost } from "./actions";

const MAX_VIDEO_SECONDS = 30;
const MAX_IMAGES = 4;

type Child = { id: string; first_name: string; avatar: string };
type Space = { id: string; name: string; level: string };
type Tag = { slug: string; label: string; emoji: string };

type ImageItem = { file: File; previewUrl: string; width: number; height: number };
type VideoItem = { file: File; previewUrl: string; durationS: number };

async function presignAndUpload(
  kind: "image" | "video" | "audio",
  file: Blob,
  mime: string,
  spaceId: string,
): Promise<string> {
  const res = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, mime, size: file.size, spaceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Upload not allowed");
  }
  const { key, url } = await res.json();
  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: file,
  });
  if (!put.ok) throw new Error("Upload failed — please try again.");
  return key;
}

function mediaDuration(url: string, type: "video" | "audio"): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(type);
    el.preload = "metadata";
    el.onloadedmetadata = () => resolve(el.duration);
    el.onerror = () => reject(new Error("Could not read file"));
    el.src = url;
  });
}

export function Composer({
  childrenProfiles,
  spaces,
  predefinedTags,
  defaultChildId,
  defaultSpaceId,
}: {
  childrenProfiles: Child[];
  spaces: Space[];
  predefinedTags: Tag[];
  defaultChildId: string | null;
  defaultSpaceId: string | null;
}) {
  const router = useRouter();
  const [childId, setChildId] = useState(defaultChildId ?? childrenProfiles[0]?.id);
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? spaces[0]?.id);
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [echo, setEcho] = useState<Blob | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function toggleTag(slug: string) {
    setTags((prev) =>
      prev.includes(slug)
        ? prev.filter((t) => t !== slug)
        : prev.length < 5
          ? [...prev, slug]
          : prev,
    );
  }

  function addCustomTag() {
    const slug = normalizeTag(customTag);
    if (slug && !tags.includes(slug) && tags.length < 5) {
      setTags((prev) => [...prev, slug]);
    }
    setCustomTag("");
  }

  async function onPickImages(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy("Shrinking photos…");
    try {
      const picked = Array.from(files).slice(0, MAX_IMAGES - images.length);
      const items: ImageItem[] = [];
      for (const file of picked) {
        // Client-side optimization before upload (PRD 4.3); also strips EXIF.
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1920,
          maxSizeMB: 1,
          useWebWorker: true,
        });
        const previewUrl = URL.createObjectURL(compressed);
        const dims = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.src = previewUrl;
          },
        );
        items.push({ file: compressed, previewUrl, ...dims });
      }
      setImages((prev) => [...prev, ...items]);
    } catch {
      setError("Could not read those photos.");
    } finally {
      setBusy(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  async function onPickVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const durationS = await mediaDuration(previewUrl, "video");
      if (durationS > MAX_VIDEO_SECONDS + 0.5) {
        URL.revokeObjectURL(previewUrl);
        setError(`Videos must be ${MAX_VIDEO_SECONDS} seconds or less — this one is ${Math.round(durationS)}s.`);
        return;
      }
      setVideo({ file, previewUrl, durationS });
    } catch {
      setError("Could not read that video.");
    } finally {
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  async function share() {
    if (!childId || !spaceId) return;
    setError(null);
    setBusy("Sharing your glimpse…");
    try {
      const media: Parameters<typeof createPost>[0]["media"] = [];
      for (const img of images) {
        const mime = img.file.type || "image/jpeg";
        const key = await presignAndUpload("image", img.file, mime, spaceId);
        media.push({ kind: "image", key, mime, width: img.width, height: img.height });
      }
      if (video) {
        const mime = video.file.type || "video/mp4";
        const key = await presignAndUpload("video", video.file, mime, spaceId);
        media.push({ kind: "video", key, mime, durationS: Math.round(video.durationS) });
      }
      if (echo) {
        const mime = echo.type || "audio/webm";
        const key = await presignAndUpload("audio", echo, mime, spaceId);
        const url = URL.createObjectURL(echo);
        const durationS = await mediaDuration(url, "audio").catch(() => 30);
        URL.revokeObjectURL(url);
        media.push({
          kind: "audio",
          key,
          mime,
          durationS: Math.min(30, Math.round(durationS)),
        });
      }

      const result = await createPost({
        spaceId,
        childId,
        bodyText: text,
        media,
        tagSlugs: tags,
      });
      if (result?.error) {
        setError(result.error);
      } else if (result?.pending) {
        setPendingNotice(true);
      } else if (result?.ok) {
        router.push(`/s/${spaceId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (pendingNotice) {
    return (
      <Card className="text-center">
        <p className="mb-2 text-4xl">🕊️</p>
        <p className="font-display text-lg font-bold text-peacock-deep">
          Sent for approval!
        </p>
        <p className="mb-4 text-ink-soft">
          A space admin will review your glimpse before it goes live.
        </p>
        <Button onClick={() => router.push(`/s/${spaceId}`)}>
          Back to the space
        </Button>
      </Card>
    );
  }

  const canShare =
    !busy && (text.trim() || images.length > 0 || video || echo);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="child">Who&apos;s sharing?</Label>
            <select
              id="child"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink focus:border-marigold focus:outline-none"
            >
              {childrenProfiles.map((c) => (
                <option key={c.id} value={c.id}>
                  {avatarEmoji(c.avatar)} {c.first_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="space">To which space?</Label>
            <select
              id="space"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink focus:border-marigold focus:outline-none"
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="What did you do today? 🌞"
          className="w-full rounded-chubby border-2 border-mango bg-surface px-4 py-3 text-ink placeholder:text-ink-soft focus:border-marigold focus:outline-none"
        />

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, i) => (
              <div key={img.previewUrl} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt=""
                  className="h-32 w-full rounded-chubby object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-sm text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {video && (
          <div className="relative">
            <video
              src={video.previewUrl}
              controls
              playsInline
              className="max-h-64 w-full rounded-chubby bg-ink"
            />
            <button
              type="button"
              aria-label="Remove video"
              onClick={() => setVideo(null)}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-sm text-white"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!video && images.length < MAX_IMAGES && (
            <Button
              variant="soft"
              type="button"
              onClick={() => imageInputRef.current?.click()}
            >
              📷 Photos
            </Button>
          )}
          {!video && images.length === 0 && (
            <Button
              variant="soft"
              type="button"
              onClick={() => videoInputRef.current?.click()}
            >
              🎥 Video <span className="text-xs">(≤30s)</span>
            </Button>
          )}
          <EchoRecorder onEcho={setEcho} />
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onPickImages(e.target.files)}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => onPickVideo(e.target.files)}
        />
      </Card>

      <Card className="space-y-3">
        <Label>Tags (up to 5)</Label>
        <div className="flex flex-wrap gap-2">
          {predefinedTags.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => toggleTag(t.slug)}
              aria-pressed={tags.includes(t.slug)}
              className={`rounded-chubby px-3 py-1.5 text-sm font-semibold transition-colors ${
                tags.includes(t.slug)
                  ? "bg-pistachio text-white"
                  : "bg-pistachio-soft text-ink"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
          {tags
            .filter((t) => !predefinedTags.some((p) => p.slug === t))
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className="rounded-chubby bg-pistachio px-3 py-1.5 text-sm font-semibold text-white"
              >
                #{t} ✕
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Make your own, e.g. grandmashouse"
            maxLength={25}
            aria-label="Custom tag"
          />
          <Button variant="soft" type="button" onClick={addCustomTag}>
            Add
          </Button>
        </div>
      </Card>

      {error && (
        <p className="rounded-chubby bg-mango-soft px-4 py-2 font-semibold text-danger">
          {error}
        </p>
      )}

      <Button
        className="w-full !min-h-14 text-lg"
        disabled={!canShare}
        onClick={share}
      >
        {busy ?? "✨ Share my glimpse"}
      </Button>
    </div>
  );
}
