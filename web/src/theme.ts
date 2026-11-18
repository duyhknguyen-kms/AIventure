"use client";
import { createTheme, alpha } from "@mui/material/styles";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

// Contrast against white (#fff), checked with the WCAG relative-luminance formula:
//   primary #1a56db 4.7:1 · success #1b5e20 7.9:1 · warning #8a4b00 6.8:1
//   error #c62828 5.6:1 · text.secondary #595959 7.0:1 · input border #767676 4.5:1
const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: "var(--font-roboto), Roboto, Helvetica, Arial, sans-serif",
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  palette: {
    mode: "light",
    contrastThreshold: 4.5,
    primary: { main: "#1a56db", light: "#3b82f6", dark: "#1341a8" },
    success: { main: "#1b5e20", light: "#4caf50" },
    warning: { main: "#8a4b00" },
    error: { main: "#c62828" },
    text: { secondary: "#595959" },
    background: { default: "#f8faff", paper: "#ffffff" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollPaddingTop: "80px", scrollBehavior: "smooth" },
        body: { background: "#f8faff" },
        ":focus-visible": {
          outline: "3px solid #1a56db",
          outlineOffset: "2px",
        },
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
    MuiLink: { defaultProps: { underline: "always" } },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: "#767676" },
        root: {
          borderRadius: 10,
          transition: "box-shadow 0.2s ease",
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1a56db" },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha("#1a56db", 0.15)}`,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlined: { borderColor: "#767676" },
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          "&:hover": { transform: "translateY(-1px)" },
          "&:active": { transform: "translateY(0)" },
        },
        contained: {
          boxShadow: "0 2px 8px rgba(26,86,219,0.25)",
          "&:hover": { boxShadow: "0 4px 16px rgba(26,86,219,0.35)" },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          backgroundColor: "rgba(255,255,255,0.88) !important",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        },
      },
    },
  },
});

export default theme;
