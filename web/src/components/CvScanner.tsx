"use client";
/**
 * CV / Resume scanner component.
 * Parses a PDF or DOCX client-side, shows a preview Dialog with checkboxes,
 * then merges confirmed extractions into the existing criteria.
 */
import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { parseCv } from "@/lib/cv/parseCv";
import {
  extractCriteriaFromText,
  mergeExtracted,
  type ExtractedCriteria,
} from "@/lib/cv/extractCriteria";
import type { Criteria } from "@/lib/matching/criteria";
import type { Seniority } from "@/lib/types";

interface Props {
  criteria: Criteria;
  onChange: (next: Criteria) => void;
}

const SENIORITY_LABELS: Record<Seniority, string> = {
  entry: "Entry-level", mid: "Mid-level", senior: "Senior",
  manager: "Manager", director: "Director", executive: "Executive",
};

export default function CvScanner({ criteria, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedCriteria | null>(null);

  // Per-item selection state for the preview dialog
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [selectedSeniority, setSelectedSeniority] = useState<Seniority[]>([]);

  async function handleFile(file: File) {
    setParsing(true);
    setParseError(null);

    const result = await parseCv(file);

    if (!result.ok) {
      setParseError(result.error);
      setParsing(false);
      return;
    }

    const ext = extractCriteriaFromText(result.text);
    setExtracted(ext);

    // Pre-select all extracted items (user can deselect)
    // Filter out items already in criteria
    setSelectedKeywords(ext.keywords.filter((k) => !criteria.keywords.includes(k)));
    setSelectedTitles(ext.targetTitles.filter((t) => !criteria.targetTitles.includes(t)));
    setSelectedSeniority(ext.seniority.filter((s) => !criteria.seniority.includes(s)));
    setParsing(false);
  }

  function handleApply() {
    onChange(
      mergeExtracted(criteria, {
        keywords: selectedKeywords,
        targetTitles: selectedTitles,
        seniority: selectedSeniority,
      }),
    );
    setExtracted(null);
  }

  const hasAnything =
    (extracted?.keywords.length ?? 0) > 0 ||
    (extracted?.targetTitles.length ?? 0) > 0 ||
    (extracted?.seniority.length ?? 0) > 0;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        aria-label="Upload CV"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so the same file can be re-uploaded
          e.target.value = "";
        }}
      />

      <Stack spacing={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={parsing ? <CircularProgress size={16} aria-hidden="true" /> : <UploadFileIcon aria-hidden="true" />}
          onClick={() => inputRef.current?.click()}
          disabled={parsing}
          aria-busy={parsing}
          fullWidth
        >
          {parsing ? "Reading CV…" : "Scan CV (PDF / DOCX)"}
        </Button>

        {parseError && (
          <Alert severity="error" onClose={() => setParseError(null)} sx={{ fontSize: "0.75rem" }}>
            {parseError}
          </Alert>
        )}
      </Stack>

      {/* Preview dialog */}
      <Dialog
        open={extracted !== null}
        onClose={() => setExtracted(null)}
        aria-labelledby="cv-preview-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="cv-preview-title">CV scan results</DialogTitle>
        <DialogContent>
          {hasAnything ? (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Review what was found. Uncheck anything you don&apos;t want to add.
                These will be merged with your existing criteria.
              </Typography>

              {(extracted?.keywords.length ?? 0) > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Skills detected ({extracted!.keywords.length})
                  </Typography>
                  <FormGroup row sx={{ gap: 1 }}>
                    {extracted!.keywords.map((kw) => (
                      <FormControlLabel
                        key={kw}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedKeywords.includes(kw)}
                            onChange={(e) =>
                              setSelectedKeywords((prev) =>
                                e.target.checked ? [...prev, kw] : prev.filter((k) => k !== kw),
                              )
                            }
                          />
                        }
                        label={<Chip label={kw} size="small" />}
                        sx={{ ml: 0 }}
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}

              {(extracted?.targetTitles.length ?? 0) > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Job titles found ({extracted!.targetTitles.length})
                    </Typography>
                    <FormGroup>
                      {extracted!.targetTitles.map((title) => (
                        <FormControlLabel
                          key={title}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedTitles.includes(title)}
                              onChange={(e) =>
                                setSelectedTitles((prev) =>
                                  e.target.checked ? [...prev, title] : prev.filter((t) => t !== title),
                                )
                              }
                            />
                          }
                          label={title}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                </>
              )}

              {(extracted?.seniority.length ?? 0) > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Seniority inferred
                    </Typography>
                    <FormGroup row>
                      {extracted!.seniority.map((level) => (
                        <FormControlLabel
                          key={level}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedSeniority.includes(level)}
                              onChange={(e) =>
                                setSelectedSeniority((prev) =>
                                  e.target.checked ? [...prev, level] : prev.filter((s) => s !== level),
                                )
                              }
                            />
                          }
                          label={SENIORITY_LABELS[level]}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                </>
              )}
            </Stack>
          ) : (
            <Typography color="text.secondary">
              No skills, job titles, or seniority signals were found in this CV.
              You can still set your criteria manually below.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtracted(null)}>Cancel</Button>
          {hasAnything && (
            <Button variant="contained" onClick={handleApply} autoFocus>
              Apply to criteria
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
