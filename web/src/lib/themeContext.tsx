"use client";

/**
 * ThemeContext — provides dark/light mode toggle, persisted in localStorage.
 */

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createTheme, ThemeProvider, alpha, type Theme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";

type Mode = "light" | "dark";

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeContextValue>({ mode: "light", toggle: () => {} });
export const useThemeMode = () => useContext(ThemeCtx);

const STORAGE_KEY = "aiventure.theme";
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

function buildTheme(mode: Mode): Theme {
  const isDark = mode === "dark";
  return createTheme({
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
      mode,
      contrastThreshold: 4.5,
      primary: { main: isDark ? "#4d8ef0" : "#1a56db", light: "#6ba3f5", dark: "#1341a8" },
      success: { main: isDark ? "#4caf50" : "#1b5e20", light: "#66bb6a" },
      warning: { main: isDark ? "#ffb74d" : "#8a4b00" },
      error: { main: isDark ? "#ef5350" : "#c62828" },
      background: {
        default: isDark ? "#0f1117" : "#f8faff",
        paper: isDark ? "#1a1d27" : "#ffffff",
      },
      text: {
        primary: isDark ? "#e8eaed" : "#0f1117",
        secondary: isDark ? "#9aa0ad" : "#595959",
      },
      divider: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { scrollPaddingTop: "80px", scrollBehavior: "smooth" },
          body: { background: isDark ? "#0f1117" : "#f8faff" },
          ":focus-visible": {
            outline: `3px solid ${isDark ? "#4d8ef0" : "#1a56db"}`,
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
          notchedOutline: { borderColor: isDark ? "rgba(255,255,255,0.23)" : "#767676" },
          root: {
            borderRadius: 10,
            transition: "box-shadow 0.2s ease",
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "#4d8ef0" : "#1a56db" },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(isDark ? "#4d8ef0" : "#1a56db", 0.2)}`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          outlined: { borderColor: isDark ? "rgba(255,255,255,0.23)" : "#767676" },
          root: { borderRadius: 8, fontWeight: 500 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            backgroundImage: "none",
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
            boxShadow: `0 2px 8px ${alpha(isDark ? "#4d8ef0" : "#1a56db", 0.25)}`,
            "&:hover": {
              boxShadow: `0 4px 16px ${alpha(isDark ? "#4d8ef0" : "#1a56db", 0.4)}`,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            backgroundColor: isDark
              ? "rgba(26,29,39,0.88) !important"
              : "rgba(255,255,255,0.88) !important",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // `mounted` becomes true after the first client render so we can read localStorage.
  const [state, setState] = useState<{ mode: Mode; mounted: boolean }>({
    mode: "light",
    mounted: false,
  });

  useEffect(() => {
    // Runs only on the client after hydration — resolve stored/OS preference.
    let resolved: Mode = "light";
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Mode | null;
      if (saved === "dark" || saved === "light") {
        resolved = saved;
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        resolved = "dark";
      }
    } catch {
      // localStorage unavailable — stay on light
    }
    // Single setState call wrapped in startTransition (non-urgent, avoids compiler warning).
    startTransition(() => {
      setState({ mode: resolved, mounted: true });
    });
  }, []);

  const { mode, mounted } = state;

  const toggle = useCallback(() => {
    setState((prev) => {
      const next: Mode = prev.mode === "light" ? "dark" : "light";
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return { mode: next, mounted: prev.mounted };
    });
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}
