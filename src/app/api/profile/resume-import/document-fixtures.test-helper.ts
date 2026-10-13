import { Buffer } from "node:buffer";
import { crc32 } from "node:zlib";

type PdfPage = { lines: string[]; link?: string };

/** A minimal valid PDF. A page without lines has no text layer, like a scan. */
export function buildPdf(pages: PdfPage[]): Buffer {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body);
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const pageIds = pages.map((page) => {
    const stream =
      page.lines.length > 0
        ? `BT /F1 12 Tf 72 720 Td 14 TL ${page.lines
            .map((line) => `(${line.replace(/([\\()])/g, "\\$1")}) Tj T*`)
            .join(" ")} ET`
        : "";
    const contentId = add(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
    const annotations = page.link
      ? ` /Annots [${add(
          `<< /Type /Annot /Subtype /Link /Rect [72 700 200 734] /Border [0 0 0] /A << /S /URI /URI (${page.link}) >> >>`,
        )} 0 R]`
      : "";
    return add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R${annotations} >>`,
    );
  });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** Writes an uncompressed ZIP archive, which is all a DOCX container needs. */
function zip(files: Record<string, string>): Buffer {
  const entries: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, "utf8");
    const nameBytes = Buffer.from(name, "utf8");
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);

    entries.push(local, nameBytes, data);
    directory.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const directorySize = directory.reduce((size, part) => size + part.length, 0);
  const count = Object.keys(files).length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(directorySize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...entries, ...directory, end]);
}

const WORD_NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

type DocxParagraph = string | { label: string; url: string };

const PACKAGE_RELATIONSHIPS =
  'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
const RELATIONSHIP_TYPES =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function renderParagraphs(paragraphs: DocxParagraph[]) {
  const relationships: string[] = [];
  const xml = paragraphs
    .map((paragraph) => {
      if (typeof paragraph === "string") {
        return `<w:p><w:r><w:t>${paragraph}</w:t></w:r></w:p>`;
      }
      const id = `rLink${relationships.length + 1}`;
      relationships.push(
        `<Relationship Id="${id}" Type="${RELATIONSHIP_TYPES}/hyperlink" Target="${paragraph.url}" TargetMode="External"/>`,
      );
      return `<w:p><w:hyperlink r:id="${id}"><w:r><w:t>${paragraph.label}</w:t></w:r></w:hyperlink></w:p>`;
    })
    .join("");
  return { xml, relationships: relationships.join("") };
}

/**
 * A minimal DOCX whose paragraphs are plain text or a single hyperlink. Text
 * and links may be escaped XML. `header` fills the page header.
 */
export function buildDocx(
  paragraphs: DocxParagraph[],
  header: DocxParagraph[] = [],
): Buffer {
  const body = renderParagraphs(paragraphs);
  const margin = renderParagraphs(header);
  const hasHeader = header.length > 0;

  return zip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${hasHeader ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships ${PACKAGE_RELATIONSHIPS}><Relationship Id="rId1" Type="${RELATIONSHIP_TYPES}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document ${WORD_NAMESPACES}><w:body>${body.xml}${hasHeader ? '<w:sectPr><w:headerReference w:type="default" r:id="rHeader"/></w:sectPr>' : ""}</w:body></w:document>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships ${PACKAGE_RELATIONSHIPS}>${body.relationships}${hasHeader ? `<Relationship Id="rHeader" Type="${RELATIONSHIP_TYPES}/header" Target="header1.xml"/>` : ""}</Relationships>`,
    ...(hasHeader && {
      "word/header1.xml": `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${WORD_NAMESPACES}>${margin.xml}</w:hdr>`,
      "word/_rels/header1.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships ${PACKAGE_RELATIONSHIPS}>${margin.relationships}</Relationships>`,
    }),
  });
}
