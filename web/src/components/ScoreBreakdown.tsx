"use client";
/**
 * §10.3 — ScoreBreakdown
 * Table with one row per scoring factor.
 * Inactive factors show "not set", not just a grey style (§10.5).
 */
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { FactorResult } from "@/lib/types";

const FACTOR_LABELS: Record<string, string> = {
  skills:     "Skills",
  title:      "Job title",
  seniority:  "Seniority",
  salary:     "Salary",
  employment: "Employment type",
  timezone:   "Timezone",
  benefits:   "Benefits",
};

interface Props {
  factors: FactorResult[];
  matchPercent: number;
}

export default function ScoreBreakdown({ factors, matchPercent }: Props) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Overall match: <strong>{matchPercent}%</strong>
      </Typography>
      <TableContainer>
        <Table size="small" aria-label="Match score breakdown">
          <caption style={{ captionSide: "bottom", fontSize: "0.75rem", color: "inherit" }}>
            Match score breakdown
          </caption>
          <TableHead>
            <TableRow>
              <TableCell>Factor</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Score</TableCell>
              <TableCell align="right">Points</TableCell>
              <TableCell>Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {factors.map((f) => (
              <TableRow key={f.key}>
                <TableCell component="th" scope="row">
                  {FACTOR_LABELS[f.key] ?? f.key}
                </TableCell>
                <TableCell>
                  {f.active ? (
                    <LinearProgress
                      variant="determinate"
                      value={f.score * 100}
                      aria-label={`${FACTOR_LABELS[f.key] ?? f.key} score`}
                      aria-valuenow={Math.round(f.score * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      not set
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption">
                    {f.active ? `${f.points.toFixed(1)} / ${f.weight}` : "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {f.detail}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
