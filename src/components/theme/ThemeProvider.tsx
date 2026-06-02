"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { themeStorageKey } from "@/components/theme/themeConstants";

export type ThemePreference = "dark" | "light" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "dark" | "light";
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(preference: ThemePreference, resolvedTheme: "dark" | "light") {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(themeStorageKey) as ThemePreference | null;
    const initialPreference = stored === "dark" || stored === "light" || stored === "system" ? stored : "dark";
    const initialResolved = initialPreference === "system" ? getSystemTheme() : initialPreference;
    setPreferenceState(initialPreference);
    setResolvedTheme(initialResolved);
    applyTheme(initialPreference, initialResolved);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    function update() {
      const nextResolved = preference === "system" ? getSystemTheme() : preference;
      setResolvedTheme(nextResolved);
      applyTheme(preference, nextResolved);
    }
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  function setPreference(nextPreference: ThemePreference) {
    window.localStorage.setItem(themeStorageKey, nextPreference);
    setPreferenceState(nextPreference);
    const nextResolved = nextPreference === "system" ? getSystemTheme() : nextPreference;
    setResolvedTheme(nextResolved);
    applyTheme(nextPreference, nextResolved);
  }

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemePreference must be used within ThemeProvider.");
  return value;
}
