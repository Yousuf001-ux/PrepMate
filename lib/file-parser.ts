import { PDFParse } from "pdf-parse";

const MAX_TEXT_LENGTH = 15000;

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function truncate(text: string): string {
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const originalWarn = console.warn;
  console.warn = () => {};
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return truncate(stripBom(result.text));
  } finally {
    console.warn = originalWarn;
    await parser.destroy();
  }
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
