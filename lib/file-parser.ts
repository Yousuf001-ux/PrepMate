const MAX_TEXT_LENGTH = 15000;

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function truncate(text: string): string {
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
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

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<ParsedFile> {
  let text: string;

  if (mimeType === "application/pdf") {
    text = await parsePdf(buffer);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    text = await parseDocx(buffer);
  } else if (mimeType === "text/plain") {
    text = parseTxt(buffer);
  } else {
    text = "";
  }

  const fileName = originalName.replace(/\.[^/.]+$/, "");

  return { text, fileName };
}
