import { describe, expect, test } from "vitest";
import { recognizeScannedPdf, type OcrResult } from "./ocr-service";

const config = {
  url: "http://ocr.example.test:8080/",
  token: "test-only-token-with-thirty-two-characters",
};
const pdf = new TextEncoder().encode("%PDF-1.4\nSynthetic scan");
const result: OcrResult = {
  truncated: false,
  pages: [
    {
      width: 1700,
      height: 2200,
      lines: [{ text: "Jordan Example", score: 0.99, box: [100, 100, 500, 128] }],
    },
  ],
};

function fetchFixture(respond: () => Response | Promise<Response>) {
  const requests: Request[] = [];
  const fetchImplementation: typeof fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return respond();
  };
  return { fetchImplementation, requests };
}

describe("OCR service client", () => {
  test("posts the PDF with the shared token and validates the result", async () => {
    const fixture = fetchFixture(() => Response.json(result));
    expect(
      await recognizeScannedPdf(config, pdf, fixture.fetchImplementation),
    ).toEqual(result);

    const request = fixture.requests[0];
    expect(request?.url).toBe("http://ocr.example.test:8080/ocr");
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("authorization")).toBe(`Bearer ${config.token}`);
    expect(request?.headers.get("content-type")).toBe("application/pdf");
    expect(new Uint8Array((await request?.arrayBuffer()) ?? [])).toEqual(pdf);
  });

  test("surfaces the service's error message", async () => {
    const fixture = fetchFixture(() =>
      Response.json(
        { error: "The OCR service is busy. Please retry shortly." },
        { status: 503 },
      ),
    );
    await expect(
      recognizeScannedPdf(config, pdf, fixture.fetchImplementation),
    ).rejects.toThrow("The OCR service is busy. Please retry shortly.");
  });

  test("rejects a response that does not match the protocol", async () => {
    const fixture = fetchFixture(() =>
      Response.json({ pages: [{ lines: [{ text: "Jordan Example" }] }] }),
    );
    await expect(
      recognizeScannedPdf(config, pdf, fixture.fetchImplementation),
    ).rejects.toThrow("Received an invalid server response. Please try again.");
  });

  test("lets an unreachable service fail the request", async () => {
    const fixture = fetchFixture(() => {
      throw new TypeError("fetch failed");
    });
    await expect(
      recognizeScannedPdf(config, pdf, fixture.fetchImplementation),
    ).rejects.toThrow(TypeError);
  });
});
