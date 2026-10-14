"""Runs in a subprocess so model memory is released after each job and a
PDF-renderer crash cannot take down the service.
"""

import json
import os
import sys

MAX_PAGES = 5
# Cap rendering size to bound memory and processing time on CPU.
PAGE_LONG_SIDE = 1800
THREADS = int(os.environ.get("OCR_THREADS", "2"))


def recognize(pdf: bytes) -> dict:
    import pypdfium2 as pdfium
    from rapidocr import RapidOCR

    # The package bundles the multilingual PP-OCRv6 small models, so nothing
    # is downloaded at runtime.
    engine = RapidOCR(
        params={
            "Global.log_level": "error",
            # The per-line 180-degree classifier occasionally flips an upright
            # line, which turns it into noise. Scans are assumed upright.
            "Global.use_cls": False,
            # Avoid resizing pages already rendered at this size.
            "Global.max_side_len": PAGE_LONG_SIDE,
            # Smaller recognition batches reduce peak memory.
            "Rec.rec_batch_num": 2,
            "EngineConfig.onnxruntime.intra_op_num_threads": THREADS,
            "EngineConfig.onnxruntime.inter_op_num_threads": 1,
        }
    )
    document = pdfium.PdfDocument(pdf)
    pages = []
    for index in range(min(len(document), MAX_PAGES)):
        page = document[index]
        image = page.render(scale=PAGE_LONG_SIDE / max(page.get_size())).to_numpy()
        result = engine(image)
        lines = []
        if result.txts:
            for box, text, score in zip(result.boxes, result.txts, result.scores):
                lines.append(
                    {
                        "text": text,
                        "score": round(float(score), 4),
                        "box": [
                            float(box[:, 0].min()),
                            float(box[:, 1].min()),
                            float(box[:, 0].max()),
                            float(box[:, 1].max()),
                        ],
                    }
                )
        pages.append(
            {"width": image.shape[1], "height": image.shape[0], "lines": lines}
        )
    return {"pages": pages, "truncated": len(document) > MAX_PAGES}


if __name__ == "__main__":
    # Native libraries may print to file descriptor 1. The result gets a
    # private copy of stdout and everything else is sent to stderr.
    result_stream = os.fdopen(os.dup(1), "w")
    os.dup2(2, 1)
    json.dump(recognize(sys.stdin.buffer.read()), result_stream)
    result_stream.close()
