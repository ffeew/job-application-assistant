const origins = process.env.E2E_ALLOWED_ORIGINS;
if (!origins)
  throw new Error("The E2E fetch guard requires an explicit origin allowlist.");
const allowed = new Set(origins.split(","));
const aiStub = process.env.E2E_AI_STUB_ORIGIN;
const originalFetch = globalThis.fetch;

// Block external requests so browser tests cannot contact live AI providers.
// Groq has no base-URL setting, so its calls are answered by the fake provider
// the tests script instead.
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (aiStub && url.origin === "https://api.groq.com") {
    const target = `${aiStub}${url.pathname}${url.search}`;
    return originalFetch(
      input instanceof Request ? new Request(target, input) : target,
      init,
    );
  }
  if (!allowed.has(url.origin)) {
    console.error(`E2E blocked unexpected external request to ${url.origin}.`);
    throw new Error(
      `E2E blocked unexpected external request to ${url.origin}.`,
    );
  }
  return originalFetch(input, init);
};

export {};
