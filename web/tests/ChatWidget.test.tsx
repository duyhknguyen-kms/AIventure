// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWidget } from "@/components/ChatWidget";
import { renderWithTheme } from "./helpers/ui";
import { makeJob } from "./helpers/jobs";

// Helper: build a streaming SSE response
function sseResponse(chunks: string[]): Response {
  const lines = [
    ...chunks.map((c) =>
      `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`
    ),
    "data: [DONE]\n\n",
  ].join("");
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(lines));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function errorJson(msg: string, status = 503): Response {
  return { ok: false, status, json: async () => ({ error: msg }) } as Response;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(sseResponse(["Hello ", "world!"])));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ChatWidget", () => {
  it("renders the toggle button", () => {
    renderWithTheme(<ChatWidget />);
    expect(screen.getByTestId("chat-toggle-button")).toBeInTheDocument();
  });

  it("panel is hidden before the button is clicked", () => {
    renderWithTheme(<ChatWidget />);
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
  });

  it("opens the chat panel on button click", async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("closes the panel with the close button", async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));
    await user.click(screen.getByRole("button", { name: /close chat/i }));
    // After close, panel fades out
    await waitFor(() => expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument(), { timeout: 500 });
  });

  it("sends a message and shows the streaming response", async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));

    const input = screen.getByTestId("chat-input");
    await user.type(input, "What skills do I need?");
    await user.click(screen.getByTestId("chat-send-button"));

    // User message appears
    await waitFor(() => expect(screen.getByTestId("chat-message-user")).toBeInTheDocument(), { timeout: 1000 });
    expect(screen.getByTestId("chat-message-user")).toHaveTextContent("What skills do I need?");

    // Streamed response appears
    await waitFor(
      () => {
        const assistantMsgs = screen.getAllByTestId("chat-message-assistant");
        const last = assistantMsgs[assistantMsgs.length - 1];
        expect(last).toHaveTextContent(/hello.*world/i);
      },
      { timeout: 3000 }
    );
  });

  it("sends message on click of send button", async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));

    await user.type(screen.getByTestId("chat-input"), "Hello");
    await user.click(screen.getByTestId("chat-send-button"));

    await waitFor(() => expect(screen.getByTestId("chat-message-user")).toHaveTextContent("Hello"), { timeout: 1000 });
  });

  it("shows an error message when the API fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorJson("No GROQ_API_KEY configured.", 503)));
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));
    await user.type(screen.getByTestId("chat-input"), "Help");
    await user.click(screen.getByTestId("chat-send-button"));

    await waitFor(
      () => expect(screen.getByTestId("chat-message-error")).toHaveTextContent(/GROQ_API_KEY/i),
      { timeout: 2000 }
    );
  });

  it("shows job context hint when a job is provided", async () => {
    const user = userEvent.setup();
    const job = makeJob({ title: "Senior React Engineer" });
    renderWithTheme(<ChatWidget job={job} />);
    await user.click(screen.getByTestId("chat-toggle-button"));

    expect(screen.getByTestId("chat-panel")).toHaveTextContent(/Senior React Engineer/);
  });

  it("renders suggestion buttons when no messages yet", async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));
    // Find the suggestion buttons (they contain "cover letter" as a suggestion)
    const suggestions = screen.getAllByText(/write a short cover letter/i);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("sends a suggestion when clicked", async () => {
    const user = userEvent.setup();
    renderWithTheme(<ChatWidget />);
    await user.click(screen.getByTestId("chat-toggle-button"));
    // Click the first element matching the cover letter suggestion
    await user.click(screen.getAllByText(/write a short cover letter/i)[0]);
    await waitFor(() => expect(screen.getByTestId("chat-message-user")).toBeInTheDocument(), { timeout: 2000 });
  });
});
