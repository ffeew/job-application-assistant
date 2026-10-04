# Resume compiler

The application and generation worker can run beside this service in the root Docker Compose stack. This service runs on a Docker-capable host and compiles application-generated LaTeX with pdfLaTeX. It uses a pinned Debian Bookworm TeX Live distribution and the `newtxtext` font family from the reference resume. Local TeX versions can have small typography differences; the Docker image is the deployment reference.

From the repository root:

```sh
docker build -f services/latex-compiler/Dockerfile -t job-resume-latex .
# Store a generated 32+ character token in an untracked file outside this repo.
# That file should contain: LATEX_COMPILER_TOKEN=<token>
docker run --rm --name job-resume-latex --stop-timeout 20 -p 127.0.0.1:8080:8080 \
  --env-file /path/to/compiler.env \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=128m \
  --cap-drop ALL --security-opt no-new-privileges --memory=1g --cpus=2 \
  job-resume-latex
```

Set `LATEX_COMPILER_URL=http://localhost:8080` and the matching `LATEX_COMPILER_TOKEN` in the application's `.env`. Other application features can run without these settings; generation reports a configuration error until they are provided. For development with system TeX Live and Poppler already installed, `bun run services/latex-compiler/index.ts` runs the same service.

For the self-hosted production stack, run `docker compose up -d --build` from the repository root. The app and worker use the private `http://latex-compiler:8080` address; the compiler needs no public tunnel route. For a separately hosted app, expose the compiler through authenticated HTTPS and configure its URL and shared token on that app. The compiler needs no Groq key or database credentials. Keep the same image digest across replicas; updates to the template or fonts require a new template version so existing saved snapshots can retain their layout. See [the deployment guide](../../docs/deployment.md) for the full stack.

`GET /health` returns `{ "status": "ok" }`. `POST /compile` requires `Authorization: Bearer <token>` and JSON `{ "tex": "..." }`. It returns `{ "pdfBase64", "pageCount", "overflowPt", "warnings" }`. Invalid requests return 400, unauthorized requests 401, oversized bodies 413, unsupported media 415, compilation failures 422, and a busy service 503.

Each compilation uses a unique temporary directory, disabled shell escape, restricted file access, a subprocess environment without service secrets, and cleanup on success or failure. Source is limited to 256 KiB, PDF output to 2 MiB, and each subprocess to 15 seconds. Two compilations may run concurrently. Packages and fonts are installed at build time; no TeX package download is required during requests. The endpoint accepts only application-generated source and must remain authenticated.

The fitting workflow checks real page count and TeX overflow diagnostics. It permits an initial compile plus three revisions, returns the best valid draft when fitting fails, and never shrinks the template's font or margins. The app uses a 180-second overall deadline and generation routes declare a 240-second platform limit. AI revisions are validated against source IDs, numeric claims and units, contribution qualifiers, and selected-entry membership; factual wording still deserves user review.

Run `bun test services/latex-compiler` for protocol and diagnostic tests. Real compilation tests run automatically when local `newtxtext` and Poppler are available; they skip otherwise. For a Docker smoke test, post a synthetic document through the authenticated endpoint and confirm a nonempty PDF, its page count, and zero significant overflow. Check both app flows, an unmet page target, compiler unavailability, saved-resume rendering, and preview/download consistency before production rollout.

Application logs should retain operational errors and durations rather than document source or personal data. Monitor service health and 422/503 responses. Roll back the app and compiler image together if generation fails; existing resume records need no database migration and remain readable.
