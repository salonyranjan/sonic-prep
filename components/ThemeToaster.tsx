"use client";

import { Toaster } from "sonner";
import { useLightTheme } from "./ThemeToggle";

export default function ThemeToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={useLightTheme() ? "light" : "dark"}
      closeButton
    />
  );
}
