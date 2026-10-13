"""Authenticated HTTP service that reads scanned resume PDFs."""

import hmac
import json
import os
import signal
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_PDF_BYTES = 8 * 1024 * 1024
# Stays below the application's 120-second request timeout.
JOB_TIMEOUT_SECONDS = 100
WORKER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recognize.py")

TOKEN = os.environ.get("OCR_SERVICE_TOKEN", "")
# One job at a time: recognition already uses every thread it is allowed.
job = threading.Semaphore(1)


def run_worker(pdf: bytes) -> bytes:
    # The worker parses untrusted files and must not inherit the service token.
    environment = {
        "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
        "LANG": "C.UTF-8",
        "PYTHONDONTWRITEBYTECODE": "1",
        "ORT_DISABLE_TELEMETRY": "1",
        "OCR_THREADS": os.environ.get("OCR_THREADS", "2"),
    }
    completed = subprocess.run(
        [sys.executable, WORKER],
        input=pdf,
        capture_output=True,
        timeout=JOB_TIMEOUT_SECONDS,
        env=environment,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.decode(errors="replace")[-2000:])
    return completed.stdout


class Handler(BaseHTTPRequestHandler):
    # Bounds how long a stalled client can hold a connection open.
    timeout = 30

    def log_message(self, format, *args):
        # Health checks arrive every 30 seconds and would bury real requests.
        if self.path != "/health":
            super().log_message(format, *args)

    def send_json(self, status: int, value) -> None:
        body = value if isinstance(value, bytes) else json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self) -> bool:
        actual = self.headers.get("Authorization", "").encode()
        return hmac.compare_digest(actual, f"Bearer {TOKEN}".encode())

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"status": "ok"})
        elif not self.authorized():
            self.send_json(401, {"error": "Unauthorized"})
        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        # The request body is left unread on early errors, so the connection
        # cannot be reused.
        self.close_connection = True
        if not self.authorized():
            self.send_json(401, {"error": "Unauthorized"})
            return
        if self.path != "/ocr":
            self.send_json(404, {"error": "Not found"})
            return
        if not self.headers.get("Content-Type", "").startswith("application/pdf"):
            self.send_json(415, {"error": "Expected a PDF."})
            return
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.send_json(411, {"error": "Content-Length is required."})
            return
        if length > MAX_PDF_BYTES:
            self.send_json(413, {"error": "The PDF is too large."})
            return
        if not job.acquire(blocking=False):
            self.send_json(
                503, {"error": "The OCR service is busy. Please retry shortly."}
            )
            return
        try:
            pdf = self.rfile.read(length)
            if len(pdf) != length or b"%PDF-" not in pdf[:1024]:
                self.send_json(400, {"error": "Expected a complete PDF document."})
                return
            try:
                self.send_json(200, run_worker(pdf))
            except subprocess.TimeoutExpired:
                self.send_json(422, {"error": "Reading the PDF took too long."})
            except RuntimeError as error:
                print(f"OCR worker failed: {error}", file=sys.stderr, flush=True)
                self.send_json(422, {"error": "The PDF could not be read."})
        finally:
            job.release()


def main() -> None:
    if len(TOKEN) < 32:
        sys.exit("OCR_SERVICE_TOKEN must contain at least 32 characters.")
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    server.daemon_threads = True

    def shutdown(*_):
        # shutdown() blocks until serve_forever() returns, so it cannot run on
        # the main thread that is serving.
        threading.Thread(target=server.shutdown).start()

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    print(f"OCR service listening on port {port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
