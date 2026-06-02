"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FightCatalogueCard } from "@/components/catalogue/FightCatalogueCard";
import { CatalogueFilters, FightCatalogueFilters } from "@/components/catalogue/FightCatalogueFilters";
import { getCatalogueWithTemplateFlags, getAllEncounterTemplates, TEMPLATE_UPDATED_EVENT } from "@/lib/catalogue/catalogueStorage";
import { getGroupedFights } from "@/lib/catalogue/getGroupedFights";
import type { EncounterCatalogueItem, EncounterTemplate } from "@/lib/catalogue/catalogueTypes";

function matchesFilters(encounter: EncounterCatalogueItem, filters: CatalogueFilters) {
  const search = filters.search.trim().toLowerCase();
  const searchable = `${encounter.name} ${encounter.shortName ?? ""} ${encounter.zoneName ?? ""} ${encounter.tierName ?? ""}`.toLowerCase();
  if (search && !searchable.includes(search)) return false;
  if (filters.expansion !== "all" && encounter.expansion !== filters.expansion) return false;
  if (filters.contentType !== "all" && encounter.contentType !== filters.contentType) return false;
  if (filters.templateState === "published" && !encounter.hasPublishedTemplate) return false;
  if (filters.templateState === "catalogue" && encounter.hasPublishedTemplate) return false;
  return true;
}

export function FightCatalogueBrowser() {
  const [catalogue, setCatalogue] = useState<EncounterCatalogueItem[]>([]);
  const [templates, setTemplates] = useState<EncounterTemplate[]>([]);
  const [filters, setFilters] = useState<CatalogueFilters>({
    search: "",
    expansion: "all",
    contentType: "all",
    templateState: "all"
  });
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    function load() {
      setCatalogue(getCatalogueWithTemplateFlags());
      setTemplates(getAllEncounterTemplates());
    }
    load();
    setIsDevMode(window.location.hostname === "localhost" || window.location.search.includes("dev=1"));
    window.addEventListener(TEMPLATE_UPDATED_EVENT, load);
    return () => window.removeEventListener(TEMPLATE_UPDATED_EVENT, load);
  }, []);

  const templatesByEncounter = useMemo(() => {
    const map = new Map<string, EncounterTemplate>();
    templates
      .slice()
      .sort((a, b) => (a.status === "published" ? -1 : 1) - (b.status === "published" ? -1 : 1))
      .forEach((template) => {
        if (!map.has(template.encounterCatalogueItemId)) map.set(template.encounterCatalogueItemId, template);
      });
    return map;
  }, [templates]);

  const expansions = useMemo(() => [...new Set(catalogue.map((encounter) => encounter.expansion))], [catalogue]);
  const filtered = useMemo(() => catalogue.filter((encounter) => matchesFilters(encounter, filters)), [catalogue, filters]);
  const currentEncounters = useMemo(() => filtered.filter((encounter) => encounter.isCurrent).sort((a, b) => a.sortOrder - b.sortOrder), [filtered]);
  const grouped = useMemo(() => getGroupedFights(filtered), [filtered]);

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Fight Templates</h1>
            <p className="text-sm text-slate-400">Browse app-owned cleaned timelines, then start a local mitigation plan.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" href="/plans/new">
              Create Plan
            </Link>
            <Link className="rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black" href="/">
              Open Planner
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">
        <FightCatalogueFilters filters={filters} expansions={expansions} onChange={setFilters} />
        <div className="space-y-8 p-5">
          {currentEncounters.length ? (
            <section>
              <h2 className="text-lg font-bold text-white">Current</h2>
              <p className="mt-1 text-sm text-slate-400">Day-one and current-tier fights for quick plan starts.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {currentEncounters.map((encounter) => (
                  <FightCatalogueCard key={`current-${encounter.id}`} encounter={encounter} template={templatesByEncounter.get(encounter.id)} isDevMode={isDevMode} />
                ))}
              </div>
            </section>
          ) : null}
          {grouped.map((section) => (
            <section key={section.group.id}>
              <h2 className="text-lg font-bold text-white">{section.group.name}</h2>
              <div className="mt-3 space-y-5">
                {section.contentTypes.map((contentSection) => (
                  <div key={contentSection.contentType}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{contentSection.contentType}</h3>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {contentSection.encounters.map((encounter) => (
                        <FightCatalogueCard key={encounter.id} encounter={encounter} template={templatesByEncounter.get(encounter.id)} isDevMode={isDevMode} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {grouped.length === 0 ? (
            <div className="rounded-md border border-slate-800 bg-slate-950 p-8 text-center text-sm text-slate-400">No fights match those filters.</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
