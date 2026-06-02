"use client";

import jobs from "@/data/jobs/jobs.json";
import type { CommonUsageLayer } from "@/lib/common-usage/commonUsageTypes";

const jobRows = jobs as Array<{ abbr: string; name: string; role: string }>;
const roles = ["tank", "healer", "melee", "ranged", "caster"];

export function CommonUsageFilters({ layer, onChange }: { layer: CommonUsageLayer; onChange: (layer: CommonUsageLayer) => void }) {
  function patch(filters: Partial<CommonUsageLayer["filters"]>) {
    onChange({ ...layer, filters: { ...layer.filters, ...filters } });
  }

  return (
    <div className="grid gap-2 rounded-md border border-slate-800 bg-slate-950/80 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-slate-200">
          <input type="checkbox" checked={layer.enabled} onChange={(event) => onChange({ ...layer, enabled: event.target.checked })} />
          Common usage overlay
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Opacity
          <input type="range" min="0.25" max="1" step="0.05" value={layer.opacity} onChange={(event) => onChange({ ...layer, opacity: Number(event.target.value) })} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
          value={layer.filters.jobs?.[0] ?? "all"}
          onChange={(event) => patch({ jobs: event.target.value === "all" ? undefined : [event.target.value] })}
          aria-label="Filter common usage by job"
        >
          <option value="all">All jobs</option>
          {jobRows.map((job) => (
            <option key={job.abbr} value={job.abbr}>
              {job.abbr}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
          value={layer.filters.roles?.[0] ?? "all"}
          onChange={(event) => patch({ roles: event.target.value === "all" ? undefined : [event.target.value] })}
          aria-label="Filter common usage by role"
        >
          <option value="all">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
        <label className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1.5">
          <input type="checkbox" checked={layer.filters.mitigationOnly ?? true} onChange={(event) => patch({ mitigationOnly: event.target.checked })} />
          Mitigation only
        </label>
        <label className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1.5">
          <input type="checkbox" checked={layer.filters.showUnmatched ?? false} onChange={(event) => patch({ showUnmatched: event.target.checked })} />
          Unmatched
        </label>
        <label className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1.5">
          <input type="checkbox" checked={layer.filters.showHealingCooldowns ?? true} onChange={(event) => patch({ showHealingCooldowns: event.target.checked })} />
          Healer cooldowns
        </label>
        <label className="flex items-center gap-2 rounded border border-slate-800 px-2 py-1.5">
          <input type="checkbox" checked={layer.filters.showSelfMitigation ?? true} onChange={(event) => patch({ showSelfMitigation: event.target.checked })} />
          Self mit
        </label>
      </div>
    </div>
  );
}
