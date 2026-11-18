"use client";

import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { matchLevel } from "@/lib/format";
import type { FactorResult, MatchResult } from "@/lib/types";

const FACTOR_LABEL: Readonly<Record<string, string>> = {
  skills: "Skills",
  title: "Title",
  seniority: "Seniority",
  salary: "Salary",
  employment: "Employment",
  timezone: "Timezone",
  benefits: "Benefits",
};

function progressColor(score: number, active: boolean): "success" | "warning" | "inherit" {
  if (!active) return "inherit";
  if (score >= 0.75) return "success";
  if (score >= 0.5) return "warning";
  return "inherit";
}

function FactorRow({ factor }: { factor: FactorResult }) {
  const label = FACTOR_LABEL[factor.key] ?? factor.key;
  const pct = Math.round(factor.score * 100);
  const color = progressColor(factor.score, factor.active);

  return (
    <TableRow
      sx={{
        "&:last-child td": { borderBottom: 0 },
        opacity: factor.active ? 1 : 0.55,
      }}
    >
      <TableCell sx={{ fontWeight: factor.active ? 600 : 400, py: 1, pl: 0, width: "16%" }}>
        {label}
      </TableCell>
      <TableCell sx={{ width: "30%", py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={factor.active ? pct : 0}
            color={color}
            aria-label={label}
            aria-valuenow={factor.active ? pct : 0}
            sx={{ flex: 1, height: 7, borderRadius: 4, bgcolor: "grey.200" }}
          />
          <Typography variant="caption" sx={{ width: 32, textAlign: "right", color: "text.secondary" }}>
            {factor.active ? `${pct}%` : "—"}
          </Typography>
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ py: 1, color: "text.secondary", width: "15%" }}>
        {factor.active ? `${factor.points.toFixed(1)} / ${factor.weight}` : "—"}
      </TableCell>
      <TableCell sx={{ py: 1, fontSize: "0.78rem", color: "text.secondary" }}>
        {factor.active ? factor.detail : "Not set in your criteria"}
      </TableCell>
    </TableRow>
  );
}

export interface ScoreBreakdownProps {
  match: MatchResult;
}

/**
 * Per-factor match score table (SPEC §10.3, FR7). Shows a progress bar,
 * points/weight and detail for each factor. Inactive factors show
 * "Not set in your criteria" and are visually dimmed.
 */
export function ScoreBreakdown({ match }: ScoreBreakdownProps) {
  const level = matchLevel(match.matchPercent);
  const levelColor =
    level === "Strong" ? "success.main" : level === "Medium" ? "warning.main" : "text.secondary";

  return (
    <Box>
      {/* Total badge */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Typography
          variant="h3"
          component="p"
          sx={{ fontWeight: 800, color: levelColor, lineHeight: 1 }}
        >
          {match.matchPercent}%
        </Typography>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: levelColor }}>
            {level} match
          </Typography>
          <Typography variant="caption" color="text.secondary">
            based on your criteria
          </Typography>
        </Box>
      </Box>

      <Table
        size="small"
        aria-label="Match score breakdown"
        sx={{ tableLayout: "fixed", "& td, & th": { px: 0.5 } }}
      >
        <caption style={{ captionSide: "bottom", display: "none" }}>Match score breakdown</caption>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.72rem", pl: 0 }}>
              FACTOR
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.72rem" }}>
              SCORE
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.72rem" }}>
              PTS / WT
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.72rem" }}>
              DETAIL
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {match.factors.map((factor) => (
            <FactorRow key={factor.key} factor={factor} />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} sx={{ pl: 0, fontWeight: 700, borderTop: "2px solid", borderColor: "divider" }}>
              Total
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 800, color: levelColor, borderTop: "2px solid", borderColor: "divider" }}
            >
              {match.matchPercent}%
            </TableCell>
            <TableCell sx={{ borderTop: "2px solid", borderColor: "divider" }} />
          </TableRow>
        </TableFooter>
      </Table>
    </Box>
  );
}

export default ScoreBreakdown;
