"use client";

import { useEffect, useState } from "react";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Prefer current DOM class if present to avoid mismatch with pre-init script
    const root = document.documentElement;
    const body = document.body;
    const domDark = root.classList.contains("dark") || body.classList.contains("dark");
    const saved = (localStorage.getItem("theme") as "light" | "dark" | null) ?? null;
    const initial = domDark ? "dark" : saved ?? getSystemTheme();
    setTheme(initial);
    if (initial === "dark") { root.classList.add("dark"); body.classList.add("dark"); }
    else { root.classList.remove("dark"); body.classList.remove("dark"); }
    // Ensure no data-theme attribute to avoid SSR/CSR mismatch
    root.removeAttribute("data-theme");
    body.removeAttribute("data-theme");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    const body = document.body;
    if (next === "dark") { root.classList.add("dark"); body.classList.add("dark"); }
    else { root.classList.remove("dark"); body.classList.remove("dark"); }
    root.removeAttribute("data-theme");
    body.removeAttribute("data-theme");
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      aria-pressed={theme === "dark"}
      className="inline-flex items-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
    >
      {theme === "dark" ? (
        <span>☀️ Light</span>
      ) : (
        <span>🌙 Dark</span>
      )}
    </button>
  );
}
