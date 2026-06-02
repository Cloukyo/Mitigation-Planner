"use client";

import { CheckCircle2, Cloud, CloudOff, Eye, Loader2 } from "lucide-react";
import { usePlannerStore } from "@/store/planner-store";

const labels = {
  saved: "Saved",
  saving: "Saving",
  local: "Local draft",
  failed: "Save failed",
  "read-only": "Read-only"
};

export function PlanSaveStatus() {
  const saveStatus = usePlannerStore((state) => state.saveStatus);
  const Icon = saveStatus === "saving" ? Loader2 : saveStatus === "failed" ? CloudOff : saveStatus === "read-only" ? Eye : saveStatus === "saved" ? CheckCircle2 : Cloud;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted">
      <Icon className={`h-3.5 w-3.5 ${saveStatus === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
      {labels[saveStatus]}
    </span>
  );
}
