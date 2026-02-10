"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="flex h-9 w-9 items-center justify-center rounded-sm border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        aria-label="Toggle theme"
      >
        <div className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="group flex h-9 w-9 items-center justify-center rounded-sm border border-gray-200 bg-white hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-yellow-400 group-hover:text-yellow-300" />
      ) : (
        <Moon className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
      )}
    </button>
  );
}
