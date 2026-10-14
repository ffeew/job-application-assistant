# Resume compiler

This service compiles application-generated LaTeX with pdfLaTeX. The root Docker Compose stack runs it privately beside the app and generation worker. It uses Debian Bookworm TeX Live packages and the `newtxtext` font family. Local TeX versions can have small typography differences; the Docker image is the deployment reference.

## Setup

From the repository root, build the image. Put a generated token of at least 32 characters in an untracked file outside the repository, containing `LATEX_COMPILER_TOKEN=<token>`, then start the service:

```sh
docker build -f services/latex-compiler/Dockerfile -t job-resume-latex .
docker run --rm --name job-resume-latex --stop-timeout 20 -p 127.0.0.1:8080:8080 \
  --env-file /path/to/compiler.env \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=128m \
  --cap-drop ALL --security-opt no-new-privileges --memory=1g --cpus=2 \
  job-resume-latex
```

Set `LATEX_COMPILER_URL=http://localhost:8080` and the matching `LATEX_COMPILER_TOKEN` in the application's `.env`. Other application features can run without these settings; generation reports a configuration error until they are provided. For development with system TeX Live and Poppler already installed, `node --import tsx services/latex-compiler/index.ts` runs the same service with `LATEX_COMPILER_TOKEN` set in its environment.

For the full self-hosted stack, follow the [deployment guide](../../docs/deployment.md). The app and worker use the private `http://latex-compiler:8080` address; the compiler needs no public tunnel route. For a separately hosted app, expose the compiler through authenticated HTTPS and configure its URL and shared token on that app. The compiler needs no Groq key or database credentials.

## Protocol and resource limits

`GET /health` returns `{ "status": "ok" }`. `POST /compile` requires `Authorization: Bearer <token>` and JSON `{ "tex": "..." }`. It returns `{ "pdfBase64", "pageCount", "overflowPt", "warnings" }`. Invalid requests return 400, unauthorized requests 401, oversized bodies 413, unsupported media 415, compilation failures 422, and a busy service 503.

Each compilation uses a unique temporary directory, disabled shell escape, restricted file access, a subprocess environment without service secrets, and cleanup on success or failure. Source is limited to 256 KiB, PDF output to 2 MiB, and each subprocess to 15 seconds. Two compilations may run concurrently. The documented Docker command and Compose service use a read-only root filesystem, a 128 MiB temporary filesystem, a 1 GiB memory limit, and two CPUs. Packages and fonts are installed at build time; no TeX package download is required during requests. The endpoint accepts only application-generated source and must remain authenticated.

The application uses these diagnostics for [resume fitting](../../README.md#features). See [background generation](../../docs/deployment.md#background-generation) for worker deadlines and recovery.

## Image and template compatibility

The Dockerfile selects the Bookworm distribution but uses a floating Node.js image tag and unversioned apt packages. Keep the same built image digest across replicas so their fonts and TeX packages match. Template or font changes must preserve rendering of saved document snapshots; introduce a new template version and retain support for prior snapshots when changing their layout.

See [compiler tests](../../docs/testing.md#unit-and-service-tests) for protocol and real-compilation checks, and the [deployment guide](../../docs/deployment.md#deployment-verification) for rollout verification. Monitor service health and compilation-failure/busy responses (422/503).
