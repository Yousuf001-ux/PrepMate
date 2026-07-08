const MAX_TEXT_LENGTH = 15000;

let workerInitialized = false;

async function ensureWorker() {
  if (workerInitialized) return;
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  workerInitialized = true;
}

export async function extractTextFromPdf(file: File): Promise<string> {
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

  if (file.type === "application/pdf") {
    return { extractedText: await extractTextFromPdf(file) };
  }

  return {
    fileBase64: await readFileAsBase64(file),
    fileType: file.type,
  };
}