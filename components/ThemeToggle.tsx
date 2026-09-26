"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = (callback: () => void) => {
  window.addEventListener("sonic-theme-change", callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== "sonic-theme") return;
    const light = event.newValue === "light";
    document.documentElement.classList.toggle("light", light);
    document.documentElement.classList.toggle("dark", !light);
    callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("sonic-theme-change", callback);
    window.removeEventListener("storage", onStorage);
  };
};
const getTheme = () => document.documentElement.classList.contains("light");
const getServerTheme = () => false;

export function useLightTheme() {
  return useSyncExternalStore(subscribe, getTheme, getServerTheme);
}

export default function ThemeToggle() {
  const light = useLightTheme();
  return (
    <button
      type="button"
      aria-label={`Switch to ${light ? "dark" : "light"} mode`}
      title={`Switch to ${light ? "dark" : "light"} mode`}
      onClick={() => {
        const next = light ? "dark" : "light";
        document.documentElement.classList.toggle("light", next === "light");
        document.documentElement.classList.toggle("dark", next === "dark");
        try {
          localStorage.setItem("sonic-theme", next);
        } catch {
          // The theme still works for this tab when browser storage is unavailable.
        }
        window.dispatchEvent(new Event("sonic-theme-change"));
      }}
      className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-violet-500"
    >
      {light ? (
        <Moon size={18} aria-hidden="true" />
      ) : (
        <Sun size={18} aria-hidden="true" />
      )}
    </button>
  );
}
