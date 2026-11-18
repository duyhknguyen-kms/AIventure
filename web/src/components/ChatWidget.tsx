"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Fade from "@mui/material/Fade";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import type { Job } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  streaming?: boolean;
}

export interface ChatWidgetProps {
  /** When set, the assistant gets context about the job the user is viewing. */
  job?: Job | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildJobContext(job: Job): string {
  const parts: string[] = [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Source: ${job.source}`,
  ];
  if (job.employmentType) parts.push(`Employment: ${job.employmentType}`);
  if (job.salary) {
    const { min, max, currency, period } = job.salary;
    if (min !== null || max !== null) {
      const range = min && max ? `${min}–${max}` : min ?? max;
      parts.push(`Salary: ${currency ?? ""} ${range} ${period}`);
    }
  }
  if (job.seniority.length) parts.push(`Seniority: ${job.seniority.join(", ")}`);
  if (job.categories.length) parts.push(`Categories: ${job.categories.join(", ")}`);
  parts.push(`Apply URL: ${job.applyUrl}`);
  // First 1 000 chars of description
  const desc = job.descriptionText.slice(0, 1000).trim();
  if (desc) parts.push(`Description excerpt: ${desc}`);
  return parts.join("\n");
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const SUGGESTIONS = [
  "What skills do I need for this role?",
  "Write a short cover letter",
  "What questions should I prepare for?",
  "How can I stand out as a candidate?",
];

// ─── Bubble ───────────────────────────────────────────────────────────────────

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isError = message.role === "error";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 1,
        alignItems: "flex-end",
        mb: 1,
      }}
      data-testid={`chat-message-${message.role}`}
    >
      {!isUser && (
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: isError ? "error.main" : "primary.main",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <SmartToyIcon sx={{ fontSize: 16 }} />
        </Avatar>
      )}
      <Box
        sx={{
          maxWidth: "80%",
          px: 1.5,
          py: 1,
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          bgcolor: isError
            ? "error.50"
            : isUser
            ? "primary.main"
            : "grey.100",
          color: isError ? "error.dark" : isUser ? "white" : "text.primary",
          fontSize: "0.85rem",
          lineHeight: 1.6,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          border: isError ? "1px solid" : "none",
          borderColor: "error.200",
        }}
      >
        {message.role === "assistant" && !message.streaming ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <Box component="p" sx={{ m: 0, mb: "0.5em", "&:last-child": { mb: 0 } }}>
                  {children}
                </Box>
              ),
              ul: ({ children }) => (
                <Box component="ul" sx={{ m: 0, mb: "0.5em", pl: 2.5, "&:last-child": { mb: 0 } }}>
                  {children}
                </Box>
              ),
              ol: ({ children }) => (
                <Box component="ol" sx={{ m: 0, mb: "0.5em", pl: 2.5, "&:last-child": { mb: 0 } }}>
                  {children}
                </Box>
              ),
              li: ({ children }) => (
                <Box component="li" sx={{ mb: 0.25 }}>
                  {children}
                </Box>
              ),
              strong: ({ children }) => (
                <Box component="strong" sx={{ fontWeight: 700 }}>
                  {children}
                </Box>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      mb: "0.5em",
                      p: 1,
                      bgcolor: "rgba(0,0,0,0.06)",
                      borderRadius: 1,
                      overflow: "auto",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                    }}
                  >
                    <code>{children}</code>
                  </Box>
                ) : (
                  <Box
                    component="code"
                    sx={{
                      px: 0.5,
                      py: 0.1,
                      bgcolor: "rgba(0,0,0,0.06)",
                      borderRadius: 0.5,
                      fontSize: "0.82rem",
                      fontFamily: "monospace",
                    }}
                  >
                    {children}
                  </Box>
                );
              },
            }}
          >
            {message.content || "…"}
          </ReactMarkdown>
        ) : (
          <>
            {message.content || (message.streaming ? "" : "…")}
            {message.streaming && (
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: 8,
                  height: 14,
                  bgcolor: "primary.light",
                  ml: 0.5,
                  verticalAlign: "middle",
                  borderRadius: 0.5,
                  animation: "blink 0.8s step-start infinite",
                  "@keyframes blink": { "50%": { opacity: 0 } },
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
                aria-hidden="true"
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

// ─── Main widget ─────────────────────────────────────────────────────────────

/**
 * Floating AI chat assistant. Uses Groq (free, OpenAI-compatible) via
 * POST /api/chat. Streams the response as Server-Sent Events.
 */
export function ChatWidget({ job }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const jobContext = job ? buildJobContext(job) : undefined;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");

      const userMsg: Message = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setBusy(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Build history (exclude streaming assistant placeholder)
      const history = [...messages, userMsg]
        .filter((m) => m.role !== "error")
        .map(({ role, content }) => ({ role, content }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, context: jobContext }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body.");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta: string = parsed?.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                accumulated += delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated, streaming: true }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated, streaming: false } : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, role: "error", content: msg, streaming: false }
              : m
          )
        );
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, messages, jobContext]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  const unreadCount = messages.filter((m) => !open && m.role === "assistant").length;
  const showEmpty = messages.length === 0;

  return (
    <>
      {/* Chat panel */}
      <Fade in={open} unmountOnExit>
        <Paper
          elevation={8}
          role="dialog"
          aria-label="AI career assistant"
          aria-modal="true"
          data-testid="chat-panel"
          sx={{
            position: "fixed",
            bottom: { xs: 72, sm: 88 },
            right: { xs: 12, sm: 24 },
            width: { xs: "calc(100vw - 24px)", sm: 380 },
            maxWidth: 420,
            height: { xs: "60vh", sm: 520 },
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 1200,
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #1a56db 0%, #0d2d6e 100%)",
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <SmartToyIcon sx={{ fontSize: 18, color: "white" }} aria-hidden="true" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 700, lineHeight: 1.2 }}>
                Career Assistant
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.68rem" }}>
                {job ? `Viewing: ${job.title.slice(0, 30)}…` : "Ask me anything about jobs"}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClose}
              aria-label="Close chat"
              sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.1)" } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, bgcolor: "white" }}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {showEmpty ? (
              <Box sx={{ textAlign: "center", pt: 2 }}>
                <AutoAwesomeIcon sx={{ fontSize: 36, color: "primary.light", mb: 1 }} aria-hidden="true" />
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  How can I help?
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  {job
                    ? `I can see you're looking at "${job.title}". Ask me anything!`
                    : "Ask about jobs, skills, cover letters, or interview prep."}
                </Typography>
                <Stack spacing={0.75}>
                  {SUGGESTIONS.map((s) => (
                    <Box
                      key={s}
                      component="button"
                      onClick={() => send(s)}
                      sx={{
                        bgcolor: "grey.50",
                        border: "1px solid",
                        borderColor: "grey.200",
                        borderRadius: 2,
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        textAlign: "left",
                        color: "text.secondary",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                        "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "rgba(26,86,219,0.04)" },
                      }}
                    >
                      {s}
                    </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              messages.map((m) => <Bubble key={m.id} message={m} />)
            )}
            <div ref={bottomRef} />
          </Box>

          {/* Input */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              px: 1.5,
              py: 1,
              borderTop: "1px solid",
              borderColor: "grey.100",
              bgcolor: "white",
            }}
          >
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder={busy ? "Responding…" : "Ask a question…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              slotProps={{
                htmlInput: {
                  "aria-label": "Chat message",
                  "data-testid": "chat-input",
                  maxLength: 2000,
                },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {busy ? (
                        <CircularProgress size={18} sx={{ mr: 0.5 }} aria-label="Waiting for response" />
                      ) : (
                        <IconButton
                          type="submit"
                          size="small"
                          disabled={!input.trim()}
                          aria-label="Send message"
                          data-testid="chat-send-button"
                          sx={{ color: input.trim() ? "primary.main" : "text.disabled" }}
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />
          </Box>
        </Paper>
      </Fade>

      {/* Floating action button */}
      <Tooltip title="Career Assistant" placement="left">
        <Box
          component="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close career assistant" : "Open career assistant"}
          aria-expanded={open}
          aria-controls="chat-panel"
          data-testid="chat-toggle-button"
          sx={{
            position: "fixed",
            bottom: { xs: 16, sm: 24 },
            right: { xs: 12, sm: 24 },
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #1a56db 0%, #0d2d6e 100%)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(26,86,219,0.4)",
            zIndex: 1200,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "scale(1.08)",
              boxShadow: "0 6px 24px rgba(26,86,219,0.55)",
            },
            "&:active": { transform: "scale(0.96)" },
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
        >
          {open ? (
            <CloseIcon sx={{ color: "white", fontSize: 22 }} aria-hidden="true" />
          ) : (
            <AutoAwesomeIcon sx={{ color: "white", fontSize: 22 }} aria-hidden="true" />
          )}
          {/* Unread badge */}
          {unreadCount > 0 && !open && (
            <Box
              aria-label={`${unreadCount} new messages`}
              sx={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 18,
                height: 18,
                borderRadius: "50%",
                bgcolor: "error.main",
                color: "white",
                fontSize: "0.65rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid white",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Box>
          )}
        </Box>
      </Tooltip>
    </>
  );
}

export default ChatWidget;
