"use client";

import type { PlanVisibility } from "@/lib/plans/planTypes";

export function PlanVisibilitySettings({
  value,
  onChange,
  disabled = false
}: {
  value: PlanVisibility;
  onChange: (value: PlanVisibility) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-60"
      value={value}
      onChange={(event) => onChange(event.target.value as PlanVisibility)}
      disabled={disabled}
      aria-label="Plan visibility"
    >
      <option value="private">Private</option>
      <option value="unlisted">Unlisted link</option>
      <option value="public">Public</option>
    </select>
  );
}
