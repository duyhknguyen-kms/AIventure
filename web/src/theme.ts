"use client";
import { createTheme } from "@mui/material/styles";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

// Contrast against white (#fff), checked with the WCAG relative-luminance formula:
//   primary #1565c0 5.7:1 · success #1b5e20 7.9:1 · warning #8a4b00 6.8:1
//   error #c62828 5.6:1 · text.secondary #595959 7.0:1 · input border #767676 4.5:1
const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: "var(--font-roboto), Roboto, Helvetica, Arial, sans-serif",
  },
  palette: {
    mode: "light",
    contrastThreshold: 4.5, // MUI picks button/chip text colours with >= 4.5:1
    primary: { main: "#1565c0" },
    success: { main: "#1b5e20" }, // strong match badge
    warning: { main: "#8a4b00" }, // medium match badge (dark amber)
    error: { main: "#c62828" },
    text: { secondary: "#595959" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Keep focused elements clear of the sticky AppBar (WCAG 2.4.11).
        html: { scrollPaddingTop: "80px" },
        // Visible focus ring, >= 2 px and >= 3:1 contrast (WCAG 2.4.7, 1.4.11).
        ":focus-visible": {
          outline: "3px solid #1565c0",
          outlineOffset: "2px",
        },
        // Respect reduced-motion: no skeleton wave, no slide/fade transitions (WCAG 2.3.3).
        [REDUCED_MOTION]: {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
    // Links are not identified by colour alone (WCAG 1.4.1).
    MuiLink: { defaultProps: { underline: "always" } },
    // Default outlined-input border is ~1.6:1; raise it to >= 3:1 (WCAG 1.4.11).
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: "#767676" },
      },
    },
    // Chip outline >= 3:1 against white (WCAG 1.4.11).
    MuiChip: {
      styleOverrides: {
        outlined: { borderColor: "#767676" },
      },
    },
  },
});

export default theme;
