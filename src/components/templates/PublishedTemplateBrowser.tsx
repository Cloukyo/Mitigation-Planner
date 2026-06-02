"use client";

import { useEffect, useState } from "react";
import { Download, Upload } from "lucide-react";
import { FightCatalogueBrowser } from "@/components/catalogue/FightCatalogueBrowser";
import { exportEncounterTemplates, importEncounterTemplates } from "@/lib/catalogue/catalogueStorage";
import type { EncounterTemplate } from "@/lib/catalogue/catalogueTypes";

export function PublishedTemplateBrowser() {
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    setImportError(null);
  }, []);

  function exportTemplates() {
    const blob = new Blob([exportEncounterTemplates()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mitigation-encounter-templates.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importTemplates(file?: File) {
    if (!file) return;
    setImportError(null);
    try {
      const templates = JSON.parse(await file.text()) as EncounterTemplate[];
      if (!Array.isArray(templates)) throw new Error("Template JSON must be an array.");
      importEncounterTemplates(templates);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import templates.");
    }
  }

  return (
    <div>
      <div className="border-b border-slate-800 bg-slate-950 px-5 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2">
          {importError ? <span className="mr-auto text-sm text-red-200">{importError}</span> : <span className="mr-auto text-sm text-slate-500">Published templates are stored locally for this MVP.</span>}
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" onClick={exportTemplates}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Templates
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import Templates
            <input className="sr-only" type="file" accept="application/json" onChange={(event) => void importTemplates(event.target.files?.[0])} />
          </label>
        </div>
      </div>
      <FightCatalogueBrowser />
    </div>
  );
}
