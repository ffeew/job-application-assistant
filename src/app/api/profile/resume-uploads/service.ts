import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { resumeUploads } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  discardFile,
  removeFile,
  storeFile,
  uploadKey,
} from "@/app/api/stored-files";

// An import may add 8 MB, so an account keeps only its most recent files.
export const MAX_KEPT_UPLOADS = 10;
const FILE_NAME_MAX = 200;

export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/\p{Cc}/gu, "").trim().slice(0, FILE_NAME_MAX);
  return cleaned || "resume";
}

const owns = (userId: string, id: string) =>
  and(eq(resumeUploads.id, id), eq(resumeUploads.userId, userId));

/**
 * Keeps the original of an imported file. Returns false when it could not be
 * kept; it never throws, because the import it follows has already succeeded.
 */
export async function keepUpload(
  userId: string,
  file: { fileName: string; mimeType: string; bytes: Uint8Array<ArrayBuffer> },
): Promise<boolean> {
  const id = randomUUID();
  const storageKey = uploadKey(userId, id);
  if (!(await storeFile(storageKey, file.bytes, file.mimeType))) return false;
  try {
    await db.insert(resumeUploads).values({
      id,
      userId,
      fileName: cleanFileName(file.fileName),
      mimeType: file.mimeType,
      sizeBytes: file.bytes.byteLength,
      storageKey,
    });
  } catch (error) {
    logger.error({ err: error }, "Could not record an imported file");
    await discardFile(storageKey);
    return false;
  }
  await removeSurplusUploads(userId);
  return true;
}

async function removeSurplusUploads(userId: string) {
  try {
    const surplus = await db
      .select({ id: resumeUploads.id, storageKey: resumeUploads.storageKey })
      .from(resumeUploads)
      .where(eq(resumeUploads.userId, userId))
      .orderBy(desc(resumeUploads.createdAt), desc(resumeUploads.id))
      .offset(MAX_KEPT_UPLOADS);
    for (const upload of surplus) {
      // File first, as in deleteUpload. One that fails stays listed and is
      // tried again after the next import.
      await removeFile(upload.storageKey);
      await db.delete(resumeUploads).where(eq(resumeUploads.id, upload.id));
    }
  } catch (error) {
    logger.error({ err: error }, "Could not remove older imported files");
  }
}

export function listUploads(userId: string) {
  return db
    .select({
      id: resumeUploads.id,
      fileName: resumeUploads.fileName,
      mimeType: resumeUploads.mimeType,
      sizeBytes: resumeUploads.sizeBytes,
      createdAt: resumeUploads.createdAt,
    })
    .from(resumeUploads)
    .where(eq(resumeUploads.userId, userId))
    .orderBy(desc(resumeUploads.createdAt), desc(resumeUploads.id));
}

export async function getUpload(userId: string, id: string) {
  const [upload] = await db
    .select()
    .from(resumeUploads)
    .where(owns(userId, id))
    .limit(1);
  return upload ?? null;
}

export async function deleteUpload(
  userId: string,
  id: string,
): Promise<boolean> {
  const upload = await getUpload(userId, id);
  if (!upload) return false;
  // The file goes first. If it cannot be removed the entry stays listed and
  // the delete can be tried again; the other order could leave the file behind.
  await removeFile(upload.storageKey);
  await db.delete(resumeUploads).where(owns(userId, id));
  return true;
}
