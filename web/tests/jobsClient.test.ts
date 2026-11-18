// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildJobsUrl, fetchJobs } from "@/lib/jobsClient";
import { makeJob, makeSources } from "./helpers/jobs";

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildJobsUrl", () => {
  it("encodes, trims and caps q at 100 characters", () => {
    expect(buildJobsUrl("  ")).toBe("/api/jobs");
    expect(buildJobsUrl(" c++ & go ")).toBe("/api/jobs?q=c%2B%2B%20%26%20go");
    expect(buildJobsUrl("x".repeat(150))).toBe(`/api/jobs?q=${"x".repeat(100)}`);
  });
});

describe("fetchJobs (SPEC §9 response shapes)", () => {
  it("returns the 200 payload", async () => {
    const body = { fetchedAt: "2026-11-17T09:00:00.000Z", sources: makeSources(), jobs: [makeJob()] };
    fetchMock.mockResolvedValue(jsonResponse(body));
    await expect(fetchJobs("react")).resolves.toEqual({ ok: true, data: body });
  });

  it("returns the error and per-source statuses of a 502", async () => {
    const sources = makeSources({ himalayas: { ok: false, error: "HTTP 503" }, remotive: { ok: false, error: "timeout" } });
    fetchMock.mockResolvedValue(jsonResponse({ error: "All sources unavailable", sources }, 502));
    await expect(fetchJobs("")).resolves.toEqual({ ok: false, status: 502, error: "All sources unavailable", sources });
  });

  it("returns the 400 message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Query parameter q must be at most 100 characters." }, 400));
    const result = await fetchJobs("q");
    expect(result).toMatchObject({ ok: false, status: 400, error: "Query parameter q must be at most 100 characters." });
  });

  it("maps a network error and a non-JSON body to failures and logs them", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(fetchJobs("")).resolves.toMatchObject({ ok: false, status: null });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => JSON.parse("<html>") } as Response);
    await expect(fetchJobs("")).resolves.toMatchObject({ ok: false, status: 200, error: "Unexpected response (HTTP 200)" });
    expect(error).toHaveBeenCalledTimes(2);
  });

  it("skips malformed jobs with a warning and rejects a wrong top-level shape", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = { fetchedAt: "2026-11-17T09:00:00.000Z", sources: makeSources(), jobs: [makeJob(), { id: 1 }] };
    fetchMock.mockResolvedValueOnce(jsonResponse(body));
    const result = await fetchJobs("");
    expect(result.ok && result.data.jobs).toHaveLength(1);
    expect(warn).toHaveBeenCalledOnce();

    fetchMock.mockResolvedValueOnce(jsonResponse({ jobs: "nope" }));
    await expect(fetchJobs("")).resolves.toMatchObject({ ok: false, error: "Unexpected response from the server" });
  });

  it("rethrows when the request is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));
    await expect(fetchJobs("", controller.signal)).rejects.toThrow("aborted");
  });
});
