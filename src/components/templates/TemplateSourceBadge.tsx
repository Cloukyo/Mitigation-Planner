import type { EncounterTemplate } from "@/lib/catalogue/catalogueTypes";

const sourceLabels: Record<EncounterTemplate["source"], string> = {
  manual: "Manual",
  fflogs_curated_reports: "Curated FFLogs",
  cactbot: "Cactbot",
  community: "Community",
  mixed: "Mixed"
};

export function TemplateSourceBadge({ source, status }: { source: EncounterTemplate["source"]; status: EncounterTemplate["status"] }) {
  const statusClass =
    status === "published"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
      : status === "reviewed"
        ? "border-teal-300/40 bg-teal-300/10 text-teal-100"
        : "border-amber-400/40 bg-amber-400/10 text-amber-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}>
      {sourceLabels[source]} - {status}
    </span>
  );
}
