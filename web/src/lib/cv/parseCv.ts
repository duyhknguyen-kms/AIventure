/**
 * Client-side CV text extraction.
 * Dynamically imports pdfjs-dist (PDF) and mammoth (DOCX) so they don't
 * affect the initial bundle. File never leaves the browser.
 */

export type ParseResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/** Maximum file size accepted (5 MB). */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function parseCv(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return parsePdf(file);
  }

  if (ext === "docx") {
    return parseDocx(file);
  }

  return { ok: false, error: `Unsupported format ".${ext ?? "unknown"}". Please use a PDF or DOCX file.` };
}

// ── PDF ───────────────────────────────────────────────────────────────────

async function parsePdf(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Dynamic import to keep pdfjs out of the initial bundle
    const pdfjsLib = await import("pdfjs-dist");

    // pdfjs needs its worker; point to the bundled legacy worker
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
    }

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const textParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      textParts.push(pageText);
    }

    const text = textParts.join("\n").trim();

    if (!text) {
      return {
        ok: false,
        error: "Could not read text from this PDF. The file may be scanned or image-based. Try a text-based version.",
      };
    }

    return { ok: true, text };
  } catch {
    return {
      ok: false,
      error: "Failed to read the PDF. It may be encrypted or corrupted.",
    };
  }
}

// ── DOCX ──────────────────────────────────────────────────────────────────

async function parseDocx(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Dynamic import to keep mammoth out of the initial bundle
    const mammoth = (await import("mammoth")).default;

    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value.trim();

    if (!text) {
      return { ok: false, error: "Could not extract text from this DOCX file." };
    }

    return { ok: true, text };
  } catch {
    return { ok: false, error: "Failed to read the DOCX file. It may be corrupted." };
  }
}
