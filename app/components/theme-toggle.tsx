"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "leadchasers-theme";
type Theme = "light" | "dark";

function preferredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "dark" ? "#0b100d" : "#fffaf3",
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  useLayoutEffect(() => {
    applyTheme(preferredTheme());
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "dark" ? "light" : "dark";

    root.classList.add("theme-changing");
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // The theme still changes for the current page when persistence is blocked.
    }
    window.setTimeout(() => root.classList.remove("theme-changing"), 240);
  }

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      type="button"
      onClick={toggleTheme}
      aria-label="Changer le theme clair ou sombre"
      title="Changer le theme"
    >
      <Sun className="theme-icon-light" size={16} aria-hidden="true" />
      <Moon className="theme-icon-dark" size={16} aria-hidden="true" />
    </button>
  );
}
