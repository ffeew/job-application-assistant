import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createObjectStorage } from "@/lib/object-storage";
import { RequestError } from "@/lib/request-error";

// Imported files and saved resume PDFs live in object storage; the database
// keeps only their keys. Storage is optional: without it nothing is kept and
// saved resumes are compiled each time they are opened.

const storage =
  env.OBJECT_STORAGE_URL &&
  env.OBJECT_STORAGE_ACCESS_KEY &&
  env.OBJECT_STORAGE_SECRET_KEY
    ? createObjectStorage({
        url: env.OBJECT_STORAGE_URL,
        bucket: env.OBJECT_STORAGE_BUCKET,
        accessKey: env.OBJECT_STORAGE_ACCESS_KEY,
        secretKey: env.OBJECT_STORAGE_SECRET_KEY,
        region: env.OBJECT_STORAGE_REGION,
      })
    : null;

export const fileStorageAvailable = storage !== null;

// Every key starts with its owner, so one account's files share a prefix. A
// resume's key is new for each stored PDF: two saves in quick succession can
// then never leave the row pointing at the other save's file.
export const resumePdfKey = (userId: string) =>
  `users/${userId}/resumes/${randomUUID()}.pdf`;
export const uploadKey = (userId: string, uploadId: string) =>
  `users/${userId}/uploads/${uploadId}`;

/** False when storage is not configured or the write failed. */
export async function storeFile(
  key: string,
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
): Promise<boolean> {
  if (!storage) return false;
  try {
    await storage.put(key, bytes, contentType);
    return true;
  } catch (error) {
    logger.error({ err: error, key }, "Could not store file");
    return false;
  }
}

// A missing file and an unreachable store call for different answers: only the
// first means the record points at nothing.
export type StoredFile =
  | { state: "found"; bytes: Uint8Array<ArrayBuffer> }
  | { state: "missing" }
  | { state: "unavailable" };

export async function readFile(key: string): Promise<StoredFile> {
  if (!storage) return { state: "unavailable" };
  try {
    const bytes = await storage.get(key);
    return bytes ? { state: "found", bytes } : { state: "missing" };
  } catch (error) {
    logger.error({ err: error, key }, "Could not read file");
    return { state: "unavailable" };
  }
}

/**
 * Removes an object nothing refers to any more: a replaced PDF, or a write
 * whose database row was never committed. A failure is logged, not raised,
 * because the caller's own work has already succeeded.
 */
export async function discardFile(key: string | null | undefined) {
  if (!storage || !key) return;
  try {
    await storage.delete(key);
  } catch (error) {
    logger.error(
      { err: error, key },
      "Could not remove file; it is no longer referenced",
    );
  }
}

/**
 * Removes an object because its owner asked for it. This runs before the row
 * is deleted and raises on failure, so a file is never left behind unnoticed.
 */
export async function removeFile(key: string | null | undefined) {
  if (!storage || !key) return;
  try {
    await storage.delete(key);
  } catch (error) {
    logger.error({ err: error, key }, "Could not delete file");
    throw new RequestError(
      "The stored file couldn't be deleted. Try again in a moment.",
      503,
    );
  }
}

/** The stored PDF's key, or null when it could not be kept. */
export async function storeResumePdf(
  userId: string,
  pdf: Uint8Array<ArrayBuffer>,
): Promise<string | null> {
  const key = resumePdfKey(userId);
  return (await storeFile(key, pdf, "application/pdf")) ? key : null;
}
