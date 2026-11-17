"use client";
/**
 * §10.3 — CriteriaForm
 * Every control has a visible label; groups use fieldset+legend (WCAG 1.3.1).
 * "Reset" restores DEFAULT_CRITERIA after a confirm Dialog.
 */
import { type SyntheticEvent, useState } from "react";
import Autocomplete, {
  type AutocompleteChangeReason,
  type AutocompleteRenderInputParams,
} from "@mui/material/Autocomplete";
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
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DEFAULT_CRITERIA, type Criteria } from "@/lib/matching/criteria";
import type { BenefitKey, Seniority, EmploymentType } from "@/lib/types";

// ── Static option lists ────────────────────────────────────────────────────

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "entry",     label: "Entry-level" },
  { value: "mid",       label: "Mid-level" },
  { value: "senior",    label: "Senior" },
  { value: "manager",   label: "Manager" },
  { value: "director",  label: "Director" },
  { value: "executive", label: "Executive" },
];

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time",  label: "Full-time" },
  { value: "part_time",  label: "Part-time" },
  { value: "contract",   label: "Contract" },
  { value: "temporary",  label: "Temporary" },
  { value: "internship", label: "Internship" },
];

const BENEFIT_OPTIONS: { key: BenefitKey; label: string }[] = [
  { key: "health",         label: "Health / Medical" },
  { key: "retirement",     label: "Retirement" },
  { key: "equity",         label: "Equity" },
  { key: "pto",            label: "Paid time off" },
  { key: "parental_leave", label: "Parental leave" },
  { key: "learning",       label: "Learning budget" },
  { key: "home_office",    label: "Home-office stipend" },
  { key: "flexible_hours", label: "Flexible hours" },
  { key: "wellness",       label: "Wellness" },
];

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "INR"];

const COUNTRY_OPTIONS = [
  { code: "AU", label: "Australia" },
  { code: "BR", label: "Brazil" },
  { code: "CA", label: "Canada" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
  { code: "IN", label: "India" },
  { code: "NL", label: "Netherlands" },
  { code: "NG", label: "Nigeria" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "SG", label: "Singapore" },
  { code: "US", label: "United States" },
  { code: "VN", label: "Vietnam" },
  { code: "ZA", label: "South Africa" },
];

/** Sentinel string for "no timezone selected" in the Select. */
const TZ_NONE = "__none__";

const TZ_OPTIONS = Array.from({ length: 27 }, (_, i) => i - 12).map((h) => ({
  value: String(h),
  numericValue: h,
  label: `UTC${h >= 0 ? "+" : ""}${h}`,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

/** Extract only string values from freeSolo Autocomplete onChange. */
function stringsOnly(v: (string | null | undefined)[]): string[] {
  return v.filter((x): x is string => typeof x === "string");
}

// ── Shared chip Autocomplete ───────────────────────────────────────────────

interface ChipAutocompleteProps {
  id: string;
  label: string;
  helperText: string;
  value: string[];
  onChange: (next: string[]) => void;
  chipColor?: "default" | "error";
}

function ChipAutocomplete({ id, label, helperText, value, onChange, chipColor = "default" }: ChipAutocompleteProps) {
  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      id={id}
      options={[] as string[]}
      value={value}
      onChange={(_: SyntheticEvent, v: (string | null | undefined)[], _reason: AutocompleteChangeReason) =>
        onChange(stringsOnly(v))
      }
      renderValue={(values: (string | null | undefined)[], getItemProps) =>
        (values as string[]).map((option: string, index: number) => {
          const { key, ...itemProps } = getItemProps({ index });
          return (
            <Chip
              key={key ?? option + index}
              label={option}
              size="small"
              color={chipColor}
              variant={chipColor === "error" ? "outlined" : "filled"}
              {...itemProps}
            />
          );
        })
      }
      renderInput={(params: AutocompleteRenderInputParams) => (
        <TextField {...params} label={label} helperText={helperText} />
      )}
    />
  );
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  criteria: Criteria;
  onChange: (next: Criteria) => void;
}

export default function CriteriaForm({ criteria, onChange }: Props) {
  const [resetOpen, setResetOpen] = useState(false);
  const [salaryError, setSalaryError] = useState("");

  const set = <K extends keyof Criteria>(key: K, value: Criteria[K]) =>
    onChange({ ...criteria, [key]: value });

  return (
    <Stack spacing={3} component="form" noValidate aria-label="Job criteria">
      <Typography variant="h6" component="h2">
        Criteria
      </Typography>

      {/* Skills */}
      <ChipAutocomplete
        id="criteria-keywords"
        label="Skills / keywords"
        helperText="e.g. react, typescript — press Enter to add"
        value={criteria.keywords}
        onChange={(v) => set("keywords", v)}
      />

      {/* Target titles */}
      <ChipAutocomplete
        id="criteria-titles"
        label="Target job titles"
        helperText="e.g. frontend engineer — press Enter to add"
        value={criteria.targetTitles}
        onChange={(v) => set("targetTitles", v)}
      />

      {/* Excluded keywords */}
      <ChipAutocomplete
        id="criteria-excluded"
        label="Excluded keywords"
        helperText="Jobs containing these are hidden — e.g. php, on-site"
        value={criteria.excludedKeywords}
        onChange={(v) => set("excludedKeywords", v)}
        chipColor="error"
      />

      <Divider />

      {/* Seniority */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Seniority</FormLabel>
        <FormGroup row>
          {SENIORITY_OPTIONS.map(({ value, label }) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox
                  checked={criteria.seniority.includes(value)}
                  onChange={() => set("seniority", toggle(criteria.seniority, value))}
                  size="small"
                />
              }
              label={label}
            />
          ))}
        </FormGroup>
      </FormControl>

      {/* Employment type */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Employment type</FormLabel>
        <FormGroup row>
          {EMPLOYMENT_OPTIONS.map(({ value, label }) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox
                  checked={criteria.employmentTypes.includes(value)}
                  onChange={() => set("employmentTypes", toggle(criteria.employmentTypes, value))}
                  size="small"
                />
              }
              label={label}
            />
          ))}
        </FormGroup>
      </FormControl>

      <Divider />

      {/* Minimum salary */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <TextField
          id="criteria-salary"
          label="Min salary (annual)"
          type="number"
          size="small"
          value={criteria.minSalary?.amount ?? ""}
          error={!!salaryError}
          helperText={salaryError || "Annual amount, e.g. 100000"}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { min: 0 } }}
          onChange={(e) => {
            const raw = e.target.value;
            if (!raw) {
              setSalaryError("");
              set("minSalary", null);
              return;
            }
            const n = Number(raw);
            if (n <= 0) {
              setSalaryError("Must be a positive number");
              return;
            }
            setSalaryError("");
            set("minSalary", { amount: n, currency: criteria.minSalary?.currency ?? "USD" });
          }}
        />
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel id="salary-currency-label">Currency</InputLabel>
          <Select
            labelId="salary-currency-label"
            id="salary-currency"
            value={criteria.minSalary?.currency ?? "USD"}
            label="Currency"
            onChange={(e) => {
              if (criteria.minSalary) {
                set("minSalary", { ...criteria.minSalary, currency: e.target.value });
              }
            }}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Country */}
      <Autocomplete<{ code: string; label: string }, false, false, false>
        id="criteria-country"
        options={COUNTRY_OPTIONS}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(o, v) => o.code === v.code}
        value={COUNTRY_OPTIONS.find((c) => c.code === criteria.country) ?? null}
        onChange={(_, v) => set("country", v?.code ?? null)}
        renderInput={(params: AutocompleteRenderInputParams) => (
          <TextField
            {...params}
            label="Your country"
            helperText="Used to filter location-restricted jobs"
            slotProps={{ htmlInput: { ...params.slotProps.htmlInput, autoComplete: "country" } }}
          />
        )}
      />

      {/* Timezone offset */}
      <FormControl size="small" fullWidth>
        <InputLabel id="tz-label">Your UTC offset</InputLabel>
        <Select
          labelId="tz-label"
          id="criteria-tz"
          value={criteria.timezoneOffset !== null ? String(criteria.timezoneOffset) : TZ_NONE}
          label="Your UTC offset"
          onChange={(e) => {
            const v = e.target.value;
            set("timezoneOffset", v === TZ_NONE ? null : Number(v));
          }}
        >
          <MenuItem value={TZ_NONE}><em>Any timezone</em></MenuItem>
          {TZ_OPTIONS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider />

      {/* Must-have benefits */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Must-have benefits</FormLabel>
        <FormGroup>
          {BENEFIT_OPTIONS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={criteria.mustHaveBenefits.includes(key)}
                  onChange={() => set("mustHaveBenefits", toggle(criteria.mustHaveBenefits, key))}
                  size="small"
                />
              }
              label={label}
            />
          ))}
        </FormGroup>
      </FormControl>

      {/* Nice-to-have benefits */}
      <FormControl component="fieldset">
        <FormLabel component="legend">Nice-to-have benefits</FormLabel>
        <FormGroup>
          {BENEFIT_OPTIONS.map(({ key, label }) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={criteria.niceToHaveBenefits.includes(key)}
                  onChange={() => set("niceToHaveBenefits", toggle(criteria.niceToHaveBenefits, key))}
                  size="small"
                />
              }
              label={label}
            />
          ))}
        </FormGroup>
      </FormControl>

      <Divider />

      {/* Reset */}
      <Box>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => setResetOpen(true)}
          fullWidth
        >
          Reset criteria
        </Button>
      </Box>

      {/* Reset confirm dialog */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        aria-labelledby="reset-dialog-title"
      >
        <DialogTitle id="reset-dialog-title">Reset all criteria?</DialogTitle>
        <DialogContent>
          All your skills, titles, filters and benefit preferences will be cleared.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            color="warning"
            onClick={() => {
              onChange(DEFAULT_CRITERIA);
              setResetOpen(false);
            }}
            autoFocus
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
