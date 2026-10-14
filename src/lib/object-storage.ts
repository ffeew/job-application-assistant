import { AwsClient } from "aws4fetch";

export type ObjectStorageConfig = {
  url: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region: string;
};

export interface ObjectStorage {
  put(
    key: string,
    bytes: Uint8Array<ArrayBuffer>,
    contentType: string,
  ): Promise<void>;
  /** Null when no object has this key. */
  get(key: string): Promise<Uint8Array<ArrayBuffer> | null>;
  /** Succeeds when the object is already gone, so a retry is safe. */
  delete(key: string): Promise<void>;
}

export class ObjectStorageError extends Error {}

// Stored files are a few megabytes at most, so a slow answer is an outage.
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Runs one storage call under a deadline that covers the request and the
 * reading of its response. The caller is released at the deadline even if the
 * request never settles, so an outage cannot hold a page or the worker.
 */
async function withinDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timedOut = new DOMException(
    "The storage request timed out.",
    "TimeoutError",
  );
  const timer = setTimeout(() => {
    controller.abort(timedOut);
  }, REQUEST_TIMEOUT_MS);
  const deadline = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => {
        reject(timedOut);
      },
      { once: true },
    );
  });
  try {
    return await Promise.race([operation(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function createObjectStorage(
  config: ObjectStorageConfig,
  fetchImplementation: typeof fetch = fetch,
): ObjectStorage {
  const client = new AwsClient({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    service: "s3",
    region: config.region,
  });
  // Path-style addresses: a self-hosted store has no hostname per bucket.
  const bucketUrl = `${config.url.replace(/\/$/, "")}/${encodeURIComponent(config.bucket)}`;

  async function send(
    key: string,
    init: RequestInit,
    signal: AbortSignal,
  ): Promise<Response> {
    const path = key.split("/").map(encodeURIComponent).join("/");
    const request = await client.sign(`${bucketUrl}/${path}`, {
      ...init,
      cache: "no-store",
    });
    // The signal is handed to fetch itself. Carried only inside the signed
    // Request, it is lost if that object is garbage-collected while the
    // request is in flight, and the request then never times out.
    return fetchImplementation(request, { signal });
  }

  // An unwanted body is read to its end, not cancelled. Next.js may hold a
  // second reader on a fetched response, and cancelling one side of a shared
  // stream waits for the other: "not found" then stalls until the timeout.
  async function drain(response: Response) {
    try {
      await response.arrayBuffer();
    } catch {
      // The status has already decided the outcome.
    }
  }

  async function fail(action: string, key: string, response: Response) {
    await drain(response);
    return new ObjectStorageError(
      `${action} ${key} failed with status ${response.status}.`,
    );
  }

  return {
    put(key, bytes, contentType) {
      return withinDeadline(async (signal) => {
        const response = await send(
          key,
          {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: bytes,
          },
          signal,
        );
        if (!response.ok) throw await fail("Storing", key, response);
        await drain(response);
      });
    },
    get(key) {
      return withinDeadline(async (signal) => {
        const response = await send(key, { method: "GET" }, signal);
        if (response.status === 404) {
          await drain(response);
          return null;
        }
        if (!response.ok) throw await fail("Reading", key, response);
        return new Uint8Array(await response.arrayBuffer());
      });
    },
    delete(key) {
      return withinDeadline(async (signal) => {
        const response = await send(key, { method: "DELETE" }, signal);
        if (!response.ok && response.status !== 404)
          throw await fail("Deleting", key, response);
        await drain(response);
      });
    },
  };
}
