import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_LIMITS, presignUpload, type MediaKind } from "@/lib/r2";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: MediaKind;
    mime?: string;
    size?: number;
    spaceId?: string;
  } | null;
  if (!body?.kind || !body.mime || !body.size || !body.spaceId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const limits = MEDIA_LIMITS[body.kind];
  if (!limits) {
    return NextResponse.json({ error: "Unknown media kind" }, { status: 400 });
  }
  if (!(limits.mimes as readonly string[]).includes(body.mime)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  if (body.size > limits.maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(limits.maxBytes / 1024 / 1024)} MB)` },
      { status: 413 },
    );
  }

  // Must be a member of the space being posted to (RLS-checked read).
  const { data: membership } = await supabase
    .from("space_members")
    .select("space_id")
    .eq("space_id", body.spaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this space" }, { status: 403 });
  }

  const key = `media/${body.spaceId}/${user.id}/${randomUUID()}.${EXT[body.mime] ?? "bin"}`;
  const url = await presignUpload(key, body.mime);
  return NextResponse.json({ key, url });
}
