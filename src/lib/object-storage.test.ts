import { afterEach, describe, expect, test, vi } from "vitest";
import { createObjectStorage, ObjectStorageError } from "./object-storage";

const config = {
  url: "http://storage.example.test:8333/",
  bucket: "job-assistant",
  accessKey: "test-only-access-key",
  secretKey: "test-only-secret-with-thirty-two-characters",
  region: "us-east-1",
};
const pdf = new TextEncoder().encode("%PDF-1.4\nSynthetic resume");
const key = "users/synthetic-user/resumes/0001.pdf";
const objectUrl = `http://storage.example.test:8333/job-assistant/${key}`;

function storageFixture(respond: () => Response | Promise<Response>) {
  const requests: Request[] = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return respond();
  };
  return {
    storage: createObjectStorage(config, fetchImplementation),
    requests,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("object storage client", () => {
  test("stores an object at a signed path-style address", async () => {
    const fixture = storageFixture(() => new Response(null, { status: 200 }));
    await fixture.storage.put(key, pdf, "application/pdf");

    const request = fixture.requests[0];
    expect(request?.url).toBe(objectUrl);
    expect(request?.method).toBe("PUT");
    expect(request?.headers.get("content-type")).toBe("application/pdf");
    expect(request?.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=test-only-access-key\/\d{8}\/us-east-1\/s3\/aws4_request, /,
    );
    // The secret signs the request and is never sent.
    expect(request?.headers.get("authorization")).not.toContain(
      config.secretKey,
    );
    expect(new Uint8Array((await request?.arrayBuffer()) ?? [])).toEqual(pdf);
  });

  test("escapes each part of a key and keeps its separators", async () => {
    const fixture = storageFixture(() => new Response(null, { status: 200 }));
    await fixture.storage.put("users/a b/uploads/ä#1", pdf, "text/plain");
    expect(fixture.requests[0]?.url).toBe(
      "http://storage.example.test:8333/job-assistant/users/a%20b/uploads/%C3%A4%231",
    );
  });

  test("reads an object's bytes", async () => {
    const fixture = storageFixture(() => new Response(pdf));
    expect(await fixture.storage.get(key)).toEqual(pdf);
    expect(fixture.requests[0]?.method).toBe("GET");
    expect(fixture.requests[0]?.url).toBe(objectUrl);
  });

  test("reports a missing object as null and other failures as errors", async () => {
    const missing = storageFixture(() => new Response(null, { status: 404 }));
    expect(await missing.storage.get(key)).toBeNull();

    const denied = storageFixture(
      () => new Response("denied", { status: 403 }),
    );
    await expect(denied.storage.get(key)).rejects.toThrow(ObjectStorageError);
    await expect(
      denied.storage.put(key, pdf, "application/pdf"),
    ).rejects.toThrow(`Storing ${key} failed with status 403.`);
  });

  test("deleting succeeds when the object is already gone", async () => {
    const deleted = storageFixture(() => new Response(null, { status: 204 }));
    await deleted.storage.delete(key);
    expect(deleted.requests[0]?.method).toBe("DELETE");

    const gone = storageFixture(() => new Response(null, { status: 404 }));
    await expect(gone.storage.delete(key)).resolves.toBeUndefined();

    const failed = storageFixture(() => new Response(null, { status: 500 }));
    await expect(failed.storage.delete(key)).rejects.toThrow(
      ObjectStorageError,
    );
  });

  test("settles when the runtime holds a second reader on the response", async () => {
    // Next.js can share a fetched body between two readers. Cancelling one
    // side of such a stream never settles, which once made every "not found"
    // wait for the request timeout.
    const held: ReadableStream[] = [];
    const shared = (status: number) => () => {
      const body = new Response("<Error>details</Error>").body;
      if (!body) throw new Error("Expected a response body");
      const [mine, theirs] = body.tee();
      held.push(theirs);
      return new Response(mine, { status });
    };

    expect(await storageFixture(shared(404)).storage.get(key)).toBeNull();
    await expect(
      storageFixture(shared(200)).storage.put(key, pdf, "application/pdf"),
    ).resolves.toBeUndefined();
    await expect(
      storageFixture(shared(400)).storage.delete(key),
    ).rejects.toThrow(ObjectStorageError);
    expect(held).toHaveLength(3);
  });

  test("releases the caller at its deadline when the request never settles", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const started = Promise.withResolvers<AbortSignal | null | undefined>();
    const fetchImplementation: typeof fetch = (_input, init) => {
      started.resolve(init?.signal);
      return new Promise<Response>(() => undefined);
    };
    const storage = createObjectStorage(config, fetchImplementation);

    const outcome = expect(storage.get(key)).rejects.toMatchObject({
      name: "TimeoutError",
    });
    // The deadline is given to fetch itself, where it cannot be lost with the
    // signed request object.
    const signal = await started.promise;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(14_999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await outcome;
    expect(signal?.aborted).toBe(true);
  });

  test("lets an unreachable store fail the call", async () => {
    const fixture = storageFixture(() => {
      throw new TypeError("fetch failed");
    });
    await expect(fixture.storage.get(key)).rejects.toThrow(TypeError);
  });
});
