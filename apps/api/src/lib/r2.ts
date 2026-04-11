import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { R2_BUCKET, R2_PUBLIC_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } from "./env";

/**
 * Singleton R2 client (S3-compatible via Cloudflare R2).
 * Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env.
 */
export function createR2Client(): S3Client {
  if (!R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID environment variable is not set");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

let _r2Client: S3Client | null = null;

/** Returns the singleton R2 client, creating it on first use. */
function getR2Client(): S3Client {
  if (!_r2Client) {
    _r2Client = createR2Client();
  }
  return _r2Client;
}

/**
 * Generates a presigned PUT URL for direct browser-to-R2 uploads.
 * The URL expires in 15 minutes.
 *
 * @param key - The R2 object key (e.g. "tenants/abc/files/uuid.pdf")
 * @param mimeType - Content-Type header the browser will send
 * @param fileSize - Expected byte size (used for Content-Length restriction)
 */
export async function generatePresignedPutUrl(
  key: string,
  mimeType: string,
  fileSize: number,
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: mimeType,
    ContentLength: fileSize,
  });

  return getSignedUrl(client, command, { expiresIn: 900 }); // 15 minutes
}

/**
 * Generates a presigned GET URL for temporary file access.
 * The URL expires in 1 hour.
 *
 * @param key - The R2 object key
 */
export async function generatePresignedGetUrl(key: string): Promise<string> {
  if (R2_PUBLIC_URL) {
    // If the bucket has a public URL configured, use it directly
    return `${R2_PUBLIC_URL}/${key}`;
  }

  const client = getR2Client();
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Deletes an object from R2.
 */
export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/**
 * Builds an R2 object key for a file upload.
 * Format: tenants/{tenantId}/projects/{projectId}/{uuid}-{sanitizedFilename}
 */
export function buildFileKey(
  tenantId: string,
  projectId: string,
  fileName: string,
): string {
  const { randomUUID } = require("crypto") as typeof import("crypto");
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `tenants/${tenantId}/projects/${projectId}/${randomUUID()}-${sanitized}`;
}
