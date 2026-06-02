"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FilePlus2, Library, Wand2 } from "lucide-react";
import { TemplateSourceBadge } from "@/components/templates/TemplateSourceBadge";
import type { EncounterCatalogueItem, EncounterTemplate } from "@/lib/catalogue/catalogueTypes";
import { usePlannerStore } from "@/store/planner-store";

export function FightCatalogueCard({
  encounter,
  template,
  isDevMode
}: {
  encounter: EncounterCatalogueItem;
  template?: EncounterTemplate;
  isDevMode: boolean;
}) {
  const router = useRouter();
  const startFromEncounterTemplate = usePlannerStore((state) => state.startFromEncounterTemplate);
  const eventCount = template?.events.length ?? 0;
  const isDmu = encounter.id === "dmu";

  return (
    <article className="rounded-md border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-white">{encounter.name}</h3>
            {encounter.shortName ? <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300">{encounter.shortName}</span> : null}
            {encounter.isCurrent ? <span className="rounded border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">Current</span> : null}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {encounter.contentType} - {encounter.expansion}
            {encounter.patch ? ` - ${encounter.patch}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${template ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100" : "border-slate-700 bg-slate-900 text-slate-300"}`}>
          {template ? "Template" : "Catalogue"}
        </span>
      </div>

      {template ? (
        <div className="mt-4 space-y-3">
          <TemplateSourceBadge source={template.source} status={template.status} />
          {isDmu ? (
            <p className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-50">
              No public log-derived timeline available yet. Start blank and add mechanics during progression.
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>
              <dt className="text-slate-500">Events</dt>
              <dd className="font-semibold text-slate-200">{eventCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Observed Damage</dt>
              <dd className="font-semibold text-slate-200">{template.damageProfile?.length ? "Included" : "Not included"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Updated</dt>
              <dd className="font-semibold text-slate-200">{new Date(template.updatedAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="font-semibold text-slate-200">{template.source.replaceAll("_", " ")}</dd>
            </div>
          </dl>
          <p className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            {isDmu ? "Blank day-one prog template. FFLogs and common usage become useful after DMU logs exist." : "Timeline and observed damage are log-derived and may need review."}
          </p>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
          <Library className="h-4 w-4 text-slate-500" aria-hidden="true" />
          Catalogue entry only. Build or import a cleaned timeline before starting from this fight.
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {template?.status === "published" ? (
          <button
            className="inline-flex items-center gap-2 rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black"
            onClick={() => {
              startFromEncounterTemplate(template);
              router.push("/");
            }}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            {isDmu ? "Start DMU Prog Plan" : "Start Plan"}
          </button>
        ) : (
          <Link className="inline-flex items-center gap-2 rounded-md border border-teal-300/50 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-300/10" href="/?import=fflogs">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Advanced Import
          </Link>
        )}
        {isDevMode ? (
          <Link className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" href={`/templates?build=${encounter.id}`}>
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            Build Template
          </Link>
        ) : null}
      </div>
    </article>
  );
}
