import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Private R2 bucket — all access via short-lived signed URLs (DECISIONS #14). */
function r2() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export const MEDIA_LIMITS = {
  image: { maxBytes: 10 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  video: { maxBytes: 100 * 1024 * 1024, mimes: ["video/mp4", "video/webm", "video/quicktime"] },
  audio: { maxBytes: 10 * 1024 * 1024, mimes: ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"] },
} as const;

export type MediaKind = keyof typeof MEDIA_LIMITS;

export async function presignUpload(key: string, mime: string): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: mime,
    }),
    { expiresIn: 600 },
  );
}

export async function presignDownload(
  key: string,
  ttlSeconds = 3600,
): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    { expiresIn: ttlSeconds },
  );
}
