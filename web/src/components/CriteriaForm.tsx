"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { BENEFIT_DICTIONARY } from "@/lib/matching/benefits";
import { DEFAULT_CRITERIA, type Criteria, type BenefitKey } from "@/lib/matching/criteria";

export interface CriteriaFormProps {
  criteria: Criteria;
  onChange: (next: Criteria) => void;
}

// Seniority / employment type definitions ------------------------------------------------

const SENIORITY_OPTIONS: { value: Criteria["seniority"][0]; label: string }[] = [
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Director" },
  { value: "executive", label: "Executive" },
];

const EMPLOYMENT_OPTIONS: { value: Criteria["employmentTypes"][0]; label: string }[] = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
  { value: "other", label: "Other" },
];

// Country list (abbreviated for MVP; covers most popular remote-work countries) ----------
const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "CH", label: "Switzerland" },
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgium" },
  { code: "IE", label: "Ireland" },
  { code: "NZ", label: "New Zealand" },
  { code: "SG", label: "Singapore" },
  { code: "IN", label: "India" },
  { code: "BR", label: "Brazil" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "KR", label: "South Korea" },
  { code: "MX", label: "Mexico" },
  { code: "AR", label: "Argentina" },
  { code: "CO", label: "Colombia" },
  { code: "ZA", label: "South Africa" },
  { code: "UA", label: "Ukraine" },
  { code: "RO", label: "Romania" },
  { code: "CZ", label: "Czech Republic" },
  { code: "HU", label: "Hungary" },
  { code: "TR", label: "Turkey" },
  { code: "IL", label: "Israel" },
  { code: "VN", label: "Vietnam" },
  { code: "TH", label: "Thailand" },
  { code: "PH", label: "Philippines" },
  { code: "ID", label: "Indonesia" },
  { code: "EG", label: "Egypt" },
  { code: "NG", label: "Nigeria" },
].sort((a, b) => a.label.localeCompare(b.label));

// Timezone options: -12 to +14 in 0.5h steps -------------------------------------------
const TIMEZONE_OPTIONS: { value: number; label: string }[] = Array.from(
  { length: (14 + 12) * 2 + 1 },
  (_, i) => {
    const offset = -12 + i * 0.5;
    const sign = offset >= 0 ? "+" : "−";
    const abs = Math.abs(offset);
    const h = Math.floor(abs);
    const m = abs % 1 === 0 ? "00" : "30";
    return { value: offset, label: `UTC ${sign}${h}:${m}` };
  },
);

// Currency options -----------------------------------------------------------------------
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "SGD", "JPY", "CHF", "NZD"];

// Section wrapper -------------------------------------------------------------------------
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="overline"
        component="p"
        sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.08em", mb: 1, fontSize: "0.68rem" }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function ChipInput({
  id,
  label,
  helperText,
  values,
  max,
  onChange,
}: {
  id: string;
  label: string;
  helperText?: string;
  values: readonly string[];
  max: number;
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const inputId = `${id}-input`;

  const addValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || values.includes(trimmed) || values.length >= max) return;
    onChange([...values, trimmed]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue(input);
    } else if (e.key === "Backspace" && input === "" && values.length > 0) {
      onChange([...values].slice(0, -1));
    }
  };

  return (
    <Box>
      <Typography
        component="label"
        htmlFor={inputId}
        variant="body2"
        sx={{ fontWeight: 600, fontSize: "0.82rem", color: "text.primary", display: "block", mb: 0.5 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          p: 1,
          border: "1px solid",
          borderColor: "#767676",
          borderRadius: 2.5,
          minHeight: 44,
          cursor: "text",
          "&:focus-within": { borderColor: "primary.main", boxShadow: "0 0 0 3px rgba(26,86,219,0.15)" },
        }}
        onClick={() => document.getElementById(inputId)?.focus()}
      >
        {values.map((v) => (
          <Chip
            key={v}
            label={v}
            size="small"
            onDelete={() => onChange(values.filter((x) => x !== v))}
            sx={{ borderRadius: 1.5, fontWeight: 500 }}
          />
        ))}
        <Box
          component="input"
          id={inputId}
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addValue(input)}
          placeholder={values.length === 0 ? "Press Enter to add" : ""}
          aria-describedby={`${id}-helper`}
          sx={{
            border: "none",
            outline: "none",
            bgcolor: "transparent",
            flex: 1,
            minWidth: 100,
            fontSize: "0.875rem",
            lineHeight: "1.4375em",
            py: 0.25,
            fontFamily: "inherit",
          }}
        />
      </Box>
      <Typography variant="caption" id={`${id}-helper`} color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        {helperText ?? `Press Enter to add · max ${max}`}
      </Typography>
    </Box>
  );
}

// Multi-select helpers --------------------------------------------------------------------
function toggleItem<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

/**
 * CriteriaForm: all SPEC §6 criteria fields (SPEC §10.3, FR5.1). MUI only,
 * WCAG 2.2 AA labelling, modern card-section layout.
 */
export function CriteriaForm({ criteria, onChange }: CriteriaFormProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const patch = <K extends keyof Criteria>(key: K, value: Criteria[K]) =>
    onChange({ ...criteria, [key]: value });

  const handleReset = () => {
    setResetDialogOpen(false);
    onChange(DEFAULT_CRITERIA);
  };

  return (
    <Box component="form" noValidate aria-label="Criteria" data-testid="criteria-form">
      {/* Keywords */}
      <FormSection title="Skills & Keywords">
        <Stack spacing={1.5}>
          <ChipInput
            id="cf-keywords"
            label="Skills / keywords"
            values={criteria.keywords}
            max={30}
            onChange={(v) => patch("keywords", v)}
          />
          <ChipInput
            id="cf-titles"
            label="Target job titles"
            values={criteria.targetTitles}
            max={10}
            onChange={(v) => patch("targetTitles", v)}
          />
          <ChipInput
            id="cf-excluded"
            label="Excluded keywords"
            helperText="Jobs containing these are hidden"
            values={criteria.excludedKeywords}
            max={30}
            onChange={(v) => patch("excludedKeywords", v)}
          />
        </Stack>
      </FormSection>

      <Divider sx={{ my: 1.5 }} />

      {/* Role */}
      <FormSection title="Role">
        <Stack spacing={1.5}>
          <FormControl size="small" fullWidth>
            <FormLabel
              component="label"
              id="cf-seniority-label"
              sx={{ mb: 0.5, fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}
            >
              Seniority
            </FormLabel>
            <Select
              id="cf-seniority"
              labelId="cf-seniority-label"
              multiple
              value={criteria.seniority}
              onChange={(e) => patch("seniority", e.target.value as Criteria["seniority"])}
              renderValue={(selected) =>
                selected.length === 0
                  ? "Any"
                  : selected
                      .map((v) => SENIORITY_OPTIONS.find((o) => o.value === v)?.label ?? v)
                      .join(", ")
              }
              displayEmpty
              data-testid="cf-seniority"
            >
              {SENIORITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Checkbox size="small" checked={criteria.seniority.includes(opt.value)} />
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <FormLabel
              component="label"
              id="cf-employment-label"
              sx={{ mb: 0.5, fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}
            >
              Employment type
            </FormLabel>
            <Select
              id="cf-employment"
              labelId="cf-employment-label"
              multiple
              value={criteria.employmentTypes}
              onChange={(e) => patch("employmentTypes", e.target.value as Criteria["employmentTypes"])}
              renderValue={(selected) =>
                selected.length === 0
                  ? "Any"
                  : selected
                      .map((v) => EMPLOYMENT_OPTIONS.find((o) => o.value === v)?.label ?? v)
                      .join(", ")
              }
              displayEmpty
              data-testid="cf-employment"
            >
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Checkbox size="small" checked={criteria.employmentTypes.includes(opt.value)} />
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </FormSection>

      <Divider sx={{ my: 1.5 }} />

      {/* Salary */}
      <FormSection title="Salary">
        <Stack direction="row" spacing={1}>
          <TextField
            id="cf-salary-amount"
            label="Min salary"
            type="number"
            size="small"
            value={criteria.minSalary?.amount ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                patch("minSalary", null);
              } else {
                const amount = Number(raw);
                if (amount > 0)
                  patch("minSalary", {
                    amount,
                    currency: criteria.minSalary?.currency ?? "USD",
                  });
              }
            }}
            slotProps={{ htmlInput: { min: 0, "data-testid": "cf-salary-amount", "aria-label": "Minimum annual salary" } }}
            sx={{ flex: 2 }}
          />
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select
              id="cf-salary-currency"
              value={criteria.minSalary?.currency ?? "USD"}
              onChange={(e) => {
                if (criteria.minSalary)
                  patch("minSalary", { ...criteria.minSalary, currency: e.target.value });
              }}
              inputProps={{ "aria-label": "Currency" }}
              data-testid="cf-salary-currency"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </FormSection>

      <Divider sx={{ my: 1.5 }} />

      {/* Location */}
      <FormSection title="Location & Timezone">
        <Stack spacing={1.5}>
          <FormControl size="small" fullWidth>
            <FormLabel
              component="label"
              htmlFor="cf-country"
              sx={{ mb: 0.5, fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}
            >
              Your country
            </FormLabel>
            <Select
              id="cf-country"
              value={criteria.country ?? ""}
              onChange={(e) => patch("country", e.target.value === "" ? null : e.target.value)}
              displayEmpty
              inputProps={{ "aria-label": "Your country" }}
              data-testid="cf-country"
            >
              <MenuItem value="">Any</MenuItem>
              {COUNTRY_OPTIONS.map((opt) => (
                <MenuItem key={opt.code} value={opt.code}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <FormLabel
              component="label"
              htmlFor="cf-timezone"
              sx={{ mb: 0.5, fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}
            >
              Your timezone
            </FormLabel>
            <Select
              id="cf-timezone"
              value={criteria.timezoneOffset !== null ? String(criteria.timezoneOffset) : ""}
              onChange={(e) => patch("timezoneOffset", e.target.value === "" ? null : Number(e.target.value))}
              displayEmpty
              inputProps={{ "aria-label": "Your timezone" }}
              data-testid="cf-timezone"
            >
              <MenuItem value="">Any</MenuItem>
              {TIMEZONE_OPTIONS.map((opt) => (
                <MenuItem key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </FormSection>

      <Divider sx={{ my: 1.5 }} />

      {/* Benefits */}
      <FormSection title="Benefits">
        <Stack spacing={1.5}>
          <FormControl component="fieldset" fullWidth data-testid="cf-must-have-group">
            <FormLabel
              component="legend"
              sx={{ mb: 0.5, fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}
            >
              Must-have
            </FormLabel>
            <FormGroup sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {BENEFIT_DICTIONARY.map((b) => (
                <FormControlLabel
                  key={b.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={criteria.mustHaveBenefits.includes(b.key as BenefitKey)}
                      onChange={() =>
                        patch(
                          "mustHaveBenefits",
                          toggleItem(criteria.mustHaveBenefits, b.key as BenefitKey),
                        )
                      }
                      slotProps={{ input: { "aria-label": `${b.label} must-have` } as never }}
                      data-testid={`cf-must-have-${b.key}`}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: "0.78rem" }}>
                      {b.label}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              ))}
            </FormGroup>
          </FormControl>

          <FormControl component="fieldset" fullWidth data-testid="cf-nice-to-have-group">
            <FormLabel
              component="legend"
              sx={{ mb: 0.5, fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}
            >
              Nice-to-have
            </FormLabel>
            <FormGroup sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {BENEFIT_DICTIONARY.map((b) => (
                <FormControlLabel
                  key={b.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={criteria.niceToHaveBenefits.includes(b.key as BenefitKey)}
                      onChange={() =>
                        patch(
                          "niceToHaveBenefits",
                          toggleItem(criteria.niceToHaveBenefits, b.key as BenefitKey),
                        )
                      }
                      slotProps={{ input: { "aria-label": `${b.label} nice-to-have` } as never }}
                      data-testid={`cf-nice-to-have-${b.key}`}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: "0.78rem" }}>
                      {b.label}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              ))}
            </FormGroup>
          </FormControl>
        </Stack>
      </FormSection>

      {/* Reset */}
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        startIcon={<RestartAltIcon aria-hidden="true" />}
        onClick={() => setResetDialogOpen(true)}
        data-testid="cf-reset-button"
        sx={{ mt: 1, color: "text.secondary", borderColor: "divider" }}
        fullWidth
      >
        Reset criteria
      </Button>

      {/* Confirm dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} data-testid="cf-reset-dialog">
        <DialogTitle>Reset all criteria?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will clear every filter and show all jobs with 100% match.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)} data-testid="cf-reset-cancel">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReset}
            data-testid="cf-reset-confirm"
            disableElevation
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CriteriaForm;
