import { describe, expect, test } from "vitest";
import type { OcrLine, OcrPage } from "@/lib/ocr-service";
import { ocrPagesToText, ocrPageToText } from "./ocr-layout";

const PAGE_WIDTH = 1700;
const LINE_HEIGHT = 28;
const LINE_PITCH = 40;

const line = (
  text: string,
  left: number,
  top: number,
  width: number,
): OcrLine => ({
  text,
  score: 0.98,
  box: [left, top, left + width, top + LINE_HEIGHT],
});
const page = (lines: OcrLine[]): OcrPage => ({
  width: PAGE_WIDTH,
  height: 2200,
  lines,
});
/** Consecutive left-aligned lines, as in one column of body text. */
const column = (texts: string[], left: number, top: number, width: number) =>
  texts.map((text, index) => line(text, left, top + index * LINE_PITCH, width));

describe("single-column pages", () => {
  test("orders lines top to bottom and separates distant blocks", () => {
    const text = ocrPageToText(
      page([
        line("Built accessible web applications.", 100, 240, 900),
        line("Jordan Example", 100, 100, 400),
        line("Experience", 100, 200, 300),
        line("jordan@example.test", 100, 140, 500),
      ]),
    );
    expect(text).toBe(
      "Jordan Example\njordan@example.test\n\nExperience\nBuilt accessible web applications.",
    );
  });

  test("keeps a right-aligned date on the row of its job title", () => {
    const entries = Array.from({ length: 6 }, (_, index) => {
      const top = 100 + index * 3 * LINE_PITCH;
      return [
        line(`Engineer ${index + 1}, Example Company`, 100, top, 600),
        line(`201${index} - 201${index + 1}`, 1380, top, 220),
        line("Shipped the billing service.", 130, top + LINE_PITCH, 500),
      ];
    }).flat();

    const rows = ocrPageToText(page(entries)).split("\n");
    expect(rows[0]).toBe("Engineer 1, Example Company    2010 - 2011");
    expect(rows[1]).toBe("Shipped the billing service.");
    expect(rows).toHaveLength(17);
  });

  test("groups a row whose boxes follow a slightly rotated baseline", () => {
    const text = ocrPageToText(
      page([
        line("Engineer, Example Company", 100, 100, 500),
        line("Singapore", 800, 106, 200),
        line("2020 - 2024", 1300, 112, 250),
        line("Shipped the billing service.", 100, 146, 600),
      ]),
    );
    expect(text).toBe(
      "Engineer, Example Company    Singapore    2020 - 2024\nShipped the billing service.",
    );
  });

  test("ignores blank and degenerate boxes", () => {
    expect(ocrPageToText(page([]))).toBe("");
    expect(
      ocrPageToText(
        page([
          line("   ", 100, 100, 300),
          { text: "Collapsed", score: 0.9, box: [100, 200, 100, 228] },
        ]),
      ),
    ).toBe("");
  });
});

describe("two-column pages", () => {
  const sidebar = column(
    ["Skills", "TypeScript", "PostgreSQL", "Accessibility", "Docker", "Testing"],
    100,
    300,
    320,
  );
  const main = column(
    [
      "Experience",
      "Senior Engineer, Example Company",
      "Led the migration of the billing platform.",
      "Reduced page load time by forty percent.",
      "Mentored four engineers across two teams.",
      "Introduced automated accessibility checks.",
      "Engineer, Example Startup",
      "Built the first version of the customer dashboard.",
      "Wrote the integration tests for the payments flow.",
      "Education",
      "Bachelor of Computing, Example University",
    ],
    560,
    300,
    1000,
  );

  test("reads the sidebar before the main column, after a full-width header", () => {
    const text = ocrPageToText(
      page([
        ...main,
        ...sidebar,
        line("Jordan Example", 350, 100, 1000),
        line("jordan@example.test | +65 5550 0100", 300, 150, 1100),
      ]),
    );
    expect(text).toBe(
      [
        "Jordan Example\njordan@example.test | +65 5550 0100",
        sidebar.map((item) => item.text).join("\n"),
        main.map((item) => item.text).join("\n"),
      ].join("\n\n"),
    );
  });

  test("keeps a full-width heading between the bands it divides", () => {
    const lowerTop = 900;
    const lowerLeft = column(["Languages", "English"], 100, lowerTop, 320);
    const lowerRight = column(["Projects", "Example Tracker"], 560, lowerTop, 900);
    const text = ocrPageToText(
      page([
        ...sidebar,
        ...main,
        line("Additional information", 400, 800, 900),
        ...lowerLeft,
        ...lowerRight,
      ]),
    );
    expect(text.split("\n\n")).toEqual([
      sidebar.map((item) => item.text).join("\n"),
      main.map((item) => item.text).join("\n"),
      "Additional information",
      "Languages\nEnglish",
      "Projects\nExample Tracker",
    ]);
  });
});

test("joins pages and skips pages without text", () => {
  expect(
    ocrPagesToText([
      page([line("First page", 100, 100, 300)]),
      page([]),
      page([line("Third page", 100, 100, 300)]),
    ]),
  ).toBe("First page\n\nThird page");
});
