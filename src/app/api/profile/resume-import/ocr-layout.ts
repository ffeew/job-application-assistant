import type { OcrPage } from "@/lib/ocr-service";

type Box = {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerY: number;
  height: number;
};

// A split is only worth making when both sides look like independent columns.
// Splitting a single column with right-aligned dates would separate every date
// from its job title, which is worse than leaving two columns interleaved.
const MIN_COLUMN_LINES = 5;
const MIN_ALIGNED_SHARE = 0.6;
const MIN_CONTIGUOUS_SHARE = 0.6;
// Headers and full-width section titles may cross the gutter.
const MAX_SPANNING_SHARE = 0.15;
// Fractions of the page width.
const GUTTER_SEARCH_START = 0.2;
const GUTTER_SEARCH_END = 0.8;
const GUTTER_SEARCH_STEP = 0.005;
const MIN_GUTTER_CLEARANCE = 0.0075;
const MAX_INDENT = 0.05;

function toBoxes(page: OcrPage): Box[] {
  return page.lines.flatMap((line) => {
    const text = line.text.trim();
    const [left, top, right, bottom] = line.box;
    if (!text || right <= left || bottom <= top) return [];
    return [
      {
        text,
        left,
        top,
        right,
        bottom,
        centerY: (top + bottom) / 2,
        height: bottom - top,
      },
    ];
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function toRows(boxes: Box[]): Box[][] {
  const rows: Box[][] = [];
  for (const box of [...boxes].sort((a, b) => a.centerY - b.centerY)) {
    const row = rows.at(-1);
    // Comparing with the previous box, not the row's first, lets a row follow
    // the gentle slope of a slightly rotated scan.
    const previous = row?.at(-1);
    if (
      row &&
      previous &&
      box.centerY - previous.centerY <=
        Math.min(box.height, previous.height) / 2
    ) {
      row.push(box);
    } else {
      rows.push([box]);
    }
  }
  return rows.map((row) => row.sort((a, b) => a.left - b.left));
}

function rowsToText(boxes: Box[]): string {
  if (boxes.length === 0) return "";
  const lineHeight = median(boxes.map((box) => box.height));
  let text = "";
  let previousBottom: number | null = null;

  for (const row of toRows(boxes)) {
    const top = Math.min(...row.map((box) => box.top));
    if (previousBottom !== null) {
      text += top - previousBottom > lineHeight * 0.8 ? "\n\n" : "\n";
    }
    row.forEach((box, index) => {
      const previous = row[index - 1];
      if (previous) {
        // A wide gap marks separate cells, such as a job title and its dates.
        text += box.left - previous.right > lineHeight * 1.5 ? "    " : " ";
      }
      text += box.text;
    });
    previousBottom = Math.max(...row.map((box) => box.bottom));
  }
  return text;
}

function isColumn(boxes: Box[], pageWidth: number): boolean {
  if (boxes.length < MIN_COLUMN_LINES) return false;

  // Column text starts at a shared left edge; right-aligned dates do not.
  const edge = Math.min(...boxes.map((box) => box.left));
  const aligned = boxes.filter(
    (box) => box.left - edge <= pageWidth * MAX_INDENT,
  ).length;
  if (aligned < boxes.length * MIN_ALIGNED_SHARE) return false;

  // Column lines follow one another; dates sit several lines apart.
  const byTop = [...boxes].sort((a, b) => a.top - b.top);
  const contiguous = byTop.filter((box, index) => {
    const next = byTop[index + 1];
    return next !== undefined && next.top - box.bottom <= box.height * 1.5;
  }).length;
  return contiguous >= boxes.length * MIN_CONTIGUOUS_SHARE;
}

function findGutter(boxes: Box[], pageWidth: number): number | null {
  if (boxes.length < MIN_COLUMN_LINES * 2) return null;
  let best: { x: number; spanning: number; clearance: number } | null = null;

  for (
    let ratio = GUTTER_SEARCH_START;
    ratio <= GUTTER_SEARCH_END;
    ratio += GUTTER_SEARCH_STEP
  ) {
    const x = ratio * pageWidth;
    const left = boxes.filter((box) => box.right <= x);
    const right = boxes.filter((box) => box.left >= x);
    const spanning = boxes.length - left.length - right.length;
    if (spanning > boxes.length * MAX_SPANNING_SHARE) continue;
    if (!isColumn(left, pageWidth) || !isColumn(right, pageWidth)) continue;

    const clearance = Math.min(
      x - Math.max(...left.map((box) => box.right)),
      Math.min(...right.map((box) => box.left)) - x,
    );
    if (clearance < pageWidth * MIN_GUTTER_CLEARANCE) continue;
    if (
      !best ||
      spanning < best.spanning ||
      (spanning === best.spanning && clearance > best.clearance)
    ) {
      best = { x, spanning, clearance };
    }
  }
  return best?.x ?? null;
}

function columnsToText(boxes: Box[], gutter: number): string {
  const blocks: string[] = [];
  let left: Box[] = [];
  let right: Box[] = [];
  let spanning: Box[] = [];
  const flushColumns = () => {
    blocks.push(rowsToText(left), rowsToText(right));
    left = [];
    right = [];
  };
  const flushSpanning = () => {
    blocks.push(rowsToText(spanning));
    spanning = [];
  };

  // Text that crosses the gutter divides the page into bands, so a full-width
  // heading stays between the columns above it and the columns below it.
  for (const box of [...boxes].sort((a, b) => a.centerY - b.centerY)) {
    if (box.right <= gutter) {
      flushSpanning();
      left.push(box);
    } else if (box.left >= gutter) {
      flushSpanning();
      right.push(box);
    } else {
      flushColumns();
      spanning.push(box);
    }
  }
  flushColumns();
  flushSpanning();
  return blocks.filter((block) => block.length > 0).join("\n\n");
}

/**
 * OCR returns positioned lines without a reading order. Rows are rebuilt from
 * the positions, and a two-column page is read one column at a time.
 */
export function ocrPageToText(page: OcrPage): string {
  const boxes = toBoxes(page);
  const gutter = findGutter(boxes, page.width);
  return gutter === null ? rowsToText(boxes) : columnsToText(boxes, gutter);
}

export function ocrPagesToText(pages: OcrPage[]): string {
  return pages
    .map(ocrPageToText)
    .filter((text) => text.length > 0)
    .join("\n\n");
}
