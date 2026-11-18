/**
 * POST /api/parse-cv
 *
 * Accepts a multipart/form-data body with one `file` field (PDF or plain text,
 * max 5 MB). Returns a JSON `CvExtraction`. Never logs file contents.
 *
 * Security: runs server-side only; the CV text never leaves the server
 * process — the API returns only the extracted keywords/titles/seniority.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCv, type CvExtraction } from "@/lib/cvParser";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["application/pdf", "text/plain", "text/html"];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import so the module is only loaded for PDF requests.
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(buffer, { max: 50 }); // max 50 pages
  return result.text;
}

export async function POST(request: NextRequest): Promise<NextResponse<CvExtraction | { error: string }>> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Could not read the uploaded file.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("No file provided. Send a 'file' field.", 400);
  }

  if (file.size === 0) {
    return errorResponse("The uploaded file is empty.", 400);
  }

  if (file.size > MAX_SIZE_BYTES) {
    return errorResponse(`File too large (max ${MAX_SIZE_BYTES / 1024 / 1024} MB).`, 413);
  }

  const mime = file.type.toLowerCase().split(";")[0].trim();
  const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isText = mime.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");

  if (!isPdf && !isText && !ALLOWED_TYPES.includes(mime)) {
    return errorResponse("Only PDF and plain-text files are supported.", 415);
  }

  let text: string;

  try {
    if (isPdf) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      text = await extractTextFromPdf(buffer);
    } else {
      text = await file.text();
    }
  } catch (err) {
    console.error("[parse-cv] text extraction failed:", err instanceof Error ? err.message : err);
    return errorResponse("Could not read the file — it may be corrupted or password-protected.", 422);
  }

  if (!text || text.trim().length < 20) {
    return errorResponse("No readable text found. Try uploading a plain-text version of your CV.", 422);
  }

  const extraction = parseCv(text);
  return NextResponse.json(extraction);
}
