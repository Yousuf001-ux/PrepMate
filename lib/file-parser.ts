const MAX_TEXT_LENGTH = 15000;

if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    constructor() {}
    static fromMatrix() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    rotate() { return new DOMMatrix(); }
    invert() { return new DOMMatrix(); }
    toString() { return ""; }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    constructor() {}
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
  };
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function truncate(text: string): string {
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // @ts-expect-error — pdfjs-dist subpath has no type declarations
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(text);
  }
  return truncate(stripBom(pages.join("\n")));
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return truncate(stripBom(result.value));
}

function parseTxt(buffer: Buffer): string {
  return truncate(stripBom(buffer.toString("utf-8")));
}

export interface ParsedFile {
  text: string;
  fileName: string;
}

/**
 * Parses uploaded files (PDF, Word Document/DOCX, or plain text) and extracts the raw textual contents.
 * Performs character truncation up to a safe threshold (15,000 characters) to optimize prompt performance
 * and avoid exceeding DeepSeek API content token limits.
 *
 * @param buffer Raw buffer containing the uploaded file content.
 * @param mimeType The file MIME type (e.g. application/pdf, text/plain).
 * @param originalName The original user file name with extension.
 * @returns Object with parsed text string and the base filename (excluding extension).
 */
export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<ParsedFile> {
  let text: string;

  // Branch file content parsing based on format MIME types.
  if (mimeType === "application/pdf") {
    // PDF extraction is page-by-page. Text items are joined sequentially.
    text = await parsePdf(buffer);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // DOCX extraction uses Mammoth to extract raw text paragraph-by-paragraph.
    text = await parseDocx(buffer);
  } else if (mimeType === "text/plain") {
    // Text documents are directly read as UTF-8.
    text = parseTxt(buffer);
  } else {
    text = "";
  }

  // Sanitize the file name by stripping the extension for clean DB title mapping.
  const fileName = originalName.replace(/\.[^/.]+$/, "");

  return { text, fileName };
}
