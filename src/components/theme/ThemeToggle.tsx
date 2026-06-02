"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemePreference, type ThemePreference } from "@/components/theme/ThemeProvider";

const options: Array<{ value: ThemePreference; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor }
];

export function ThemeToggle() {
  const { preference, setPreference } = useThemePreference();

  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-700 bg-slate-950/70 text-xs text-slate-300" aria-label="Theme preference">
      {options.map((option) => {
        const Icon = option.icon;
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            className={`inline-flex items-center gap-1.5 border-l border-slate-700 px-2.5 py-2 first:border-l-0 ${
              active ? "bg-amber-300 text-black" : "hover:bg-slate-900 hover:text-slate-100"
            }`}
            type="button"
            onClick={() => setPreference(option.value)}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
