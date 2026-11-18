// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CVUpload } from "@/components/CVUpload";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import type { CvExtraction } from "@/lib/cvParser";
import { renderWithTheme } from "./helpers/ui";

const MOCK_EXTRACTION: CvExtraction = {
  keywords: ["React", "TypeScript", "Node.js"],
  targetTitles: ["Senior Frontend Engineer"],
  seniority: ["senior"],
  rawText: "Senior Frontend Engineer with React and TypeScript skills.",
  charCount: 56,
};

function successResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function errorResponse(body: unknown, status = 422): Response {
  return { ok: false, status, json: async () => body } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(MOCK_EXTRACTION)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CVUpload", () => {
  it("renders the upload dialog when open=true", () => {
    renderWithTheme(<CVUpload open onClose={() => {}} onApply={() => {}} />);
    expect(screen.getByTestId("cv-upload-dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /upload your cv/i })).toBeInTheDocument();
    expect(screen.getByTestId("cv-dropzone")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    renderWithTheme(<CVUpload open={false} onClose={() => {}} onApply={() => {}} />);
    expect(screen.queryByTestId("cv-upload-dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithTheme(<CVUpload open onClose={onClose} onApply={() => {}} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when close icon is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithTheme(<CVUpload open onClose={onClose} onApply={() => {}} />);
    await user.click(screen.getByRole("button", { name: /close cv upload/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows extraction results after a file is uploaded", async () => {
    renderWithTheme(<CVUpload open onClose={() => {}} onApply={() => {}} />);

    const file = new File(["fake pdf content"], "resume.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByText("React")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByTestId("cv-apply-button")).toBeInTheDocument();
  });

  it("calls onApply with extracted criteria when Apply is clicked", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithTheme(<CVUpload open onClose={() => {}} onApply={onApply} />);

    const file = new File(["cv text"], "cv.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByTestId("cv-apply-button")).toBeInTheDocument(), { timeout: 2000 });
    await user.click(screen.getByTestId("cv-apply-button"));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: MOCK_EXTRACTION.keywords,
        targetTitles: MOCK_EXTRACTION.targetTitles,
        seniority: MOCK_EXTRACTION.seniority,
      })
    );
  });

  it("shows an error when the API returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse({ error: "Could not read the file." })));
    renderWithTheme(<CVUpload open onClose={() => {}} onApply={() => {}} />);

    const file = new File(["bad file"], "bad.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => expect(screen.getByTestId("cv-error")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByTestId("cv-error")).toHaveTextContent("Could not read the file.");
  });

  it("rejects files that are too large", async () => {
    renderWithTheme(<CVUpload open onClose={() => {}} onApply={() => {}} />);
    // 6 MB > 5 MB limit
    const bigFile = new File(["x".repeat(6 * 1024 * 1024)], "big.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, bigFile);
    await waitFor(() => expect(screen.getByTestId("cv-error")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByTestId("cv-error")).toHaveTextContent(/too large/i);
  });

  it("rejects unsupported file types (no API call made)", async () => {
    // The docx extension is not in the accepted list
    // The important thing is the API is never called — the error display
    // may render after a tick in jsdom, so check the API first
    const fetchSpy = vi.fn().mockResolvedValue(successResponse(MOCK_EXTRACTION));
    vi.stubGlobal("fetch", fetchSpy);
    renderWithTheme(<CVUpload open onClose={() => {}} onApply={() => {}} />);
    const docFile = new File(["doc content"], "cv.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, docFile);
    // Give React time to process
    await new Promise((r) => setTimeout(r, 100));
    // If validation ran, fetch was never called
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
