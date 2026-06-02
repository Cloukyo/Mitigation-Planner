"use client";

import { useEffect, useState } from "react";
import { getAllEncounterTemplates, getCatalogueWithTemplateFlags, TEMPLATE_UPDATED_EVENT } from "@/lib/catalogue/catalogueStorage";
import type { EncounterCatalogueItem, EncounterTemplate } from "@/lib/catalogue/catalogueTypes";

export function EncounterTemplateManager() {
  const [catalogue, setCatalogue] = useState<EncounterCatalogueItem[]>([]);
  const [templates, setTemplates] = useState<EncounterTemplate[]>([]);

  useEffect(() => {
    function loadTemplates() {
      setCatalogue(getCatalogueWithTemplateFlags());
      setTemplates(getAllEncounterTemplates());
    }
    loadTemplates();
    window.addEventListener(TEMPLATE_UPDATED_EVENT, loadTemplates);
    return () => window.removeEventListener(TEMPLATE_UPDATED_EVENT, loadTemplates);
  }, []);

  return (
    <section className="space-y-3 border-t border-slate-800 p-4">
      <h2 className="text-sm font-bold text-white">Encounter Templates</h2>
      <div className="grid gap-2">
        {catalogue.map((item) => (
          <div key={item.id} className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-sm">
            <div className="font-semibold text-slate-100">{item.name}</div>
            <div className="text-xs text-slate-400">
              {item.contentType} - {item.expansion} {item.hasPublishedTemplate ? "- template available" : "- catalogue only"}
            </div>
          </div>
        ))}
        {templates.map((template) => (
          <div key={template.id} className="rounded-md border border-slate-800 bg-slate-900/50 p-3 text-sm">
            <div className="font-semibold text-slate-100">{template.name}</div>
            <div className="text-xs text-slate-400">
              {template.source} - {template.status} - {template.events.length} events - {template.damageProfile?.length ? "observed damage" : "timeline only"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
