"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Theme choice: System (follow the OS), Light or Dark. The choice lives in
 * localStorage; the resolved theme is the `data-theme` attribute on <html>,
 * which globals.css keys the dark colours on. An in-app switch is used because
 * some browsers (e.g. Zen) ignore the OS / devtools colour-scheme override.
 */

type Pref = "system" | "light" | "dark";
const KEY = "proofpay-theme";
const EVENT = "proofpay-theme";
const ORDER: Pref[] = ["system", "light", "dark"];
const LABEL: Record<Pref, string> = { system: "◐ System", light: "☀ Light", dark: "☾ Dark" };

/**
 * Runs before hydration (next/script beforeInteractive in the root layout) so the
 * first paint already has the right theme. ThemeToggle applies it again, so the
 * theme still works if this script is delayed.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(KEY)})||"system";
document.documentElement.dataset.theme=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;}catch(e){}})();`;

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPref(): Pref {
  try {
    const p = localStorage.getItem(KEY);
    return p === "light" || p === "dark" ? p : "system";
  } catch {
    return "system";
  }
}

function applyTheme(pref: Pref) {
  document.documentElement.dataset.theme = pref === "system" ? (darkQuery().matches ? "dark" : "light") : pref;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as Pref);
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]!;

  // Apply on mount and on every change; follow the OS live while on System.
  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system") return;
    const query = darkQuery();
    const onOsChange = () => applyTheme("system");
    query.addEventListener("change", onOsChange);
    return () => query.removeEventListener("change", onOsChange);
  }, [pref]);

  return (
    <button
      type="button"
      className="theme-toggle"
      title={`Theme: ${pref}. Click for ${next}.`}
      onClick={() => {
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // storage blocked: the theme still changes for this page view
        }
        applyTheme(next);
        window.dispatchEvent(new Event(EVENT));
      }}
    >
      {LABEL[pref]}
    </button>
  );
}
