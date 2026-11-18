"use client";

import { useCallback, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WorkIcon from "@mui/icons-material/Work";
import type { CvExtraction } from "@/lib/cvParser";
import type { Criteria } from "@/lib/matching/criteria";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";

export interface CVUploadProps {
  open: boolean;
  onClose: () => void;
  onApply: (patch: Partial<Criteria>) => void;
}

type State =
  | { phase: "idle" }
  | { phase: "uploading"; filename: string }
  | { phase: "done"; filename: string; extraction: CvExtraction }
  | { phase: "error"; message: string };

const ACCEPT = ".pdf,.txt,application/pdf,text/plain";
const MAX_MB = 5;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DropZone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled]
  );

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload CV file — drag and drop or click to browse"
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click(); }}
      data-testid="cv-dropzone"
      sx={{
        border: "2px dashed",
        borderColor: over ? "primary.main" : "grey.300",
        borderRadius: 3,
        p: { xs: 3, sm: 5 },
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        bgcolor: over ? "rgba(26,86,219,0.04)" : "grey.50",
        "&:hover": disabled ? {} : { borderColor: "primary.main", bgcolor: "rgba(26,86,219,0.04)" },
        "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <CloudUploadIcon
        sx={{
          fontSize: 48,
          color: over ? "primary.main" : "grey.400",
          mb: 1.5,
          transition: "color 0.2s",
          transform: over ? "translateY(-4px)" : "translateY(0)",
        }}
        aria-hidden="true"
      />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
        Drop your CV here
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        or click to browse — PDF or TXT, up to {MAX_MB} MB
      </Typography>
      <Button variant="outlined" size="small" disabled={disabled} sx={{ pointerEvents: "none" }}>
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
    </Box>
  );
}

function ExtractionPreview({ extraction }: { extraction: CvExtraction }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Stack spacing={2}>
      {extraction.keywords.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1, letterSpacing: "0.06em" }}>
            SKILLS DETECTED ({extraction.keywords.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {extraction.keywords.map((k) => (
              <Chip key={k} label={k} size="small" sx={{ borderRadius: 1.5, fontWeight: 500, bgcolor: "primary.50", color: "primary.dark" }} />
            ))}
          </Box>
        </Box>
      )}

      {extraction.targetTitles.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1, letterSpacing: "0.06em" }}>
            JOB TITLES FOUND ({extraction.targetTitles.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {extraction.targetTitles.map((t) => (
              <Chip key={t} label={t} size="small" variant="outlined" sx={{ borderRadius: 1.5, fontWeight: 500 }} />
            ))}
          </Box>
        </Box>
      )}

      {extraction.seniority.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1, letterSpacing: "0.06em" }}>
            SENIORITY DETECTED
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            {extraction.seniority.map((s) => (
              <Chip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                size="small"
                color="primary"
                sx={{ borderRadius: 1.5, fontWeight: 600 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {extraction.keywords.length === 0 && extraction.targetTitles.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          No skills or titles detected. The CV might have an unusual format. You can still apply and edit manually.
        </Alert>
      )}

      <Box>
        <Button
          size="small"
          endIcon={
            <ExpandMoreIcon
              aria-hidden="true"
              sx={{ transform: showRaw ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          }
          onClick={() => setShowRaw((v) => !v)}
          sx={{ color: "text.disabled", textTransform: "none", pl: 0, fontSize: "0.75rem" }}
        >
          {showRaw ? "Hide extracted text" : "View extracted text"}
        </Button>
        <Collapse in={showRaw}>
          <Box
            component="pre"
            sx={{
              mt: 1,
              p: 1.5,
              maxHeight: 160,
              overflowY: "auto",
              bgcolor: "action.hover",
              borderRadius: 2,
              fontSize: "0.72rem",
              fontFamily: "monospace",
              color: "text.secondary",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {extraction.rawText || "(empty)"}
          </Box>
        </Collapse>
      </Box>
    </Stack>
  );
}

/**
 * CV upload and parsing dialog. Accepts PDF or TXT, extracts skills/titles/
 * seniority deterministically, then lets the user preview and apply to criteria.
 */
export function CVUpload({ open, onClose, onApply }: CVUploadProps) {
  const [state, setState] = useState<State>({ phase: "idle" });

  const reset = () => setState({ phase: "idle" });

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setState({ phase: "error", message: `File too large — max ${MAX_MB} MB.` });
      return;
    }

    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (!["pdf", "txt"].includes(ext) && !file.type.startsWith("text/") && file.type !== "application/pdf") {
      setState({ phase: "error", message: "Only PDF and .txt files are supported." });
      return;
    }

    setState({ phase: "uploading", filename: file.name });

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/parse-cv", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const extraction = await res.json() as CvExtraction;
      setState({ phase: "done", filename: file.name, extraction });
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Failed to parse CV.",
      });
    }
  }, []);

  const handleApply = () => {
    if (state.phase !== "done") return;
    const { extraction } = state;
    const patch: Partial<typeof DEFAULT_CRITERIA> = {};
    if (extraction.keywords.length > 0) patch.keywords = extraction.keywords;
    if (extraction.targetTitles.length > 0) patch.targetTitles = extraction.targetTitles;
    if (extraction.seniority.length > 0) patch.seniority = extraction.seniority;
    onApply(patch);
    onClose();
    reset();
  };

  const handleClose = () => {
    onClose();
    // Don't reset immediately so the state stays if dialog is re-opened
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="cv-upload-title"
      data-testid="cv-upload-dialog"
    >
      <DialogTitle id="cv-upload-title" sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: "linear-gradient(135deg, #1a56db 0%, #0d2d6e 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WorkIcon sx={{ fontSize: 18, color: "white" }} aria-hidden="true" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Upload your CV
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Auto-fills your skills, titles &amp; seniority
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={handleClose}
          aria-label="Close CV upload"
          size="small"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {state.phase === "idle" && (
          <DropZone onFile={handleFile} disabled={false} />
        )}

        {state.phase === "uploading" && (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} aria-label="Parsing CV" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Parsing {state.filename}…
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Extracting skills, job titles and experience level
            </Typography>
          </Box>
        )}

        {state.phase === "error" && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="error" sx={{ borderRadius: 2 }} data-testid="cv-error">
              {state.message}
            </Alert>
            <DropZone onFile={handleFile} disabled={false} />
          </Stack>
        )}

        {state.phase === "done" && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {/* File badge */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "success.50",
                border: "1px solid",
                borderColor: "success.200",
              }}
            >
              <DescriptionIcon sx={{ color: "success.dark", fontSize: "1.3rem" }} aria-hidden="true" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "success.dark", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {state.filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(state.extraction.charCount)} extracted
                </Typography>
              </Box>
              <CheckCircleIcon sx={{ color: "success.main", fontSize: "1.2rem" }} aria-hidden="true" />
            </Box>

            <Divider />
            <ExtractionPreview extraction={state.extraction} />

            <Button
              size="small"
              variant="text"
              onClick={reset}
              sx={{ alignSelf: "flex-start", color: "text.secondary", textTransform: "none" }}
            >
              Upload a different file
            </Button>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ color: "text.secondary", borderColor: "divider" }}>
          Cancel
        </Button>
        {state.phase === "done" && (
          <Button
            variant="contained"
            onClick={handleApply}
            data-testid="cv-apply-button"
            disableElevation
            sx={{ minWidth: 140 }}
          >
            Apply to criteria
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default CVUpload;
