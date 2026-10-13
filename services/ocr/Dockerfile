# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm
# ONNX Runtime reports usage to Microsoft unless telemetry is switched off.
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ORT_DISABLE_TELEMETRY=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir --root-user-action=ignore -r requirements.txt
COPY recognize.py server.py smoke.py ./
RUN useradd --system --uid 10001 --no-create-home ocr
USER ocr
# Without network access, this fails the build unless the bundled models can
# read a page on their own.
RUN --network=none python smoke.py
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health', timeout=4)"
CMD ["python", "server.py"]
