const MAX_TEXT_LENGTH = 15000;

function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "txt") return "text/plain";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "";
}

let workerInitialized = false;

async function ensureWorker() {
  if (workerInitialized) return;

  try {
    // @ts-expect-error — pdfjs-dist subpath has no type declarations
    const workerModule = await import("pdfjs-dist/build/pdf.worker.mjs");
    (globalThis as any).pdfjsWorker = workerModule;
  } catch {}

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  workerInitialized = true;
}

async function extractTextFromPdf(file: File): Promise<string> {
  await ensureWorker();
  const pdfjs = await import("pdfjs-dist");

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(text);
  }

  const result = pages.join("\n").trim();
  return result.slice(0, MAX_TEXT_LENGTH);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function prepareFileData(file: File | null): Promise<{
  fileBase64?: string;
  fileType?: string;
  extractedText?: string;
}> {
  if (!file) return {};

  const mimeType = getMimeType(file);

  if (mimeType === "application/pdf") {
    try {
      return { extractedText: await extractTextFromPdf(file) };
    } catch {
      return {
        fileBase64: await readFileAsBase64(file),
        fileType: "application/pdf",
      };
    }
  }

  return {
    fileBase64: await readFileAsBase64(file),
    fileType: mimeType || file.type,
  };
}

export function validateFileSize(file: File, maxBytes = 10 * 1024 * 1024): boolean {
  return file.size <= maxBytes;
}