# OCR service

This service reads scanned resume PDFs. Resume import extracts text from PDFs and DOCX files inside the application and calls this service only when a PDF has no usable text layer. It runs [RapidOCR](https://github.com/RapidAI/RapidOCR), which executes PaddleOCR's PP-OCRv6 models with ONNX Runtime on the CPU. No GPU, API key, or outbound network access is needed.

## Setup

The root Docker Compose stack builds and runs the service privately beside the app. To run it on its own, put a generated token of at least 32 characters in an untracked file outside the repository, containing `OCR_SERVICE_TOKEN=<token>`:

```sh
docker build -t job-resume-ocr services/ocr
docker run --rm --name job-resume-ocr -p 127.0.0.1:8081:8080 \
  --env-file /path/to/ocr.env \
  --read-only --cap-drop ALL --security-opt no-new-privileges --memory=1g --cpus=2 \
  job-resume-ocr
```

Set `OCR_SERVICE_URL=http://localhost:8081` and the matching `OCR_SERVICE_TOKEN` in the application's `.env`. Without these settings the application still imports text-based PDFs, DOCX, and TXT files; a scanned PDF returns an error that asks for a text-based file. For host development, `docker compose -f docker-compose.dev.yml up -d` starts the service on that port.

## Protocol and resource limits

`GET /health` returns `{ "status": "ok" }`. `POST /ocr` requires `Authorization: Bearer <token>` and a PDF body with `Content-Type: application/pdf`. It returns `{ "pages": [{ "width", "height", "lines": [{ "text", "score", "box" }] }], "truncated" }`, where `box` is `[left, top, right, bottom]` in page pixels and `truncated` reports that pages beyond the limit were skipped. Invalid requests return 400, unauthorized requests 401, a missing length 411, oversized bodies 413, unsupported media 415, unreadable or slow documents 422, and a busy service 503.

Lines come back with positions, not in reading order. The application rebuilds rows and columns in `src/app/api/profile/resume-import/ocr-layout.ts`.

Uploads are limited to 8 MiB and the first five pages, rendered at 1800 pixels on the long side. One document is read at a time, with a 100-second limit. Each document is read in a subprocess that exits afterwards, so the idle service uses about 16 MiB and the models' memory (about 700 MiB at peak) is returned after every job. The subprocess does not receive the service token. `OCR_THREADS` sets the inference thread count and defaults to 2; raise it together with the container's CPU limit.

The Compose service uses a read-only root filesystem, no capabilities, a 1 GiB memory limit, and two CPUs. Its network is internal: the service can be reached by the app and can reach nothing else.

## Models and languages

The pinned `rapidocr` package bundles the multilingual PP-OCRv6 small detection and recognition models, so the image downloads no models and runs offline. They read Latin-script text, including accented characters. Other tiers and language-specific models are selected through the `params` passed to `RapidOCR` in `recognize.py`; models outside the bundle must be downloaded during the image build because the container cannot fetch them at runtime.

Two defaults are changed on purpose. ONNX Runtime's usage telemetry is switched off with `ORT_DISABLE_TELEMETRY=1`. The per-line 180-degree classifier is disabled because it occasionally flips an upright line into noise, so pages scanned upside down are not corrected.

## Tests

The image build runs `smoke.py` without network access: it draws text onto a blank page, saves it as an image-only PDF, and fails the build unless the same text is read back. The application's client and reading-order logic are covered by [unit tests](../../docs/testing.md#unit-and-service-tests).
