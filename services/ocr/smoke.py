import io

from PIL import Image, ImageDraw, ImageFont

from recognize import recognize

EXPECTED = ["Jordan Example", "jordan@example.test", "Senior Software Engineer"]

image = Image.new("RGB", (1240, 1754), "white")
draw = ImageDraw.Draw(image)
font = ImageFont.load_default(size=32)
for index, text in enumerate(EXPECTED):
    draw.text((120, 140 + index * 70), text, font=font, fill="black")

# Saving an image as a PDF produces a page without a text layer, like a scan.
pdf = io.BytesIO()
image.save(pdf, format="PDF", resolution=150)

result = recognize(pdf.getvalue())
lines = [line["text"] for page in result["pages"] for line in page["lines"]]
assert lines == EXPECTED, f"Unexpected OCR output: {lines}"
assert result["truncated"] is False
print("OCR smoke test passed.")
