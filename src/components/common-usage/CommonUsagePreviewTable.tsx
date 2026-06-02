"use client";

import abilitiesJson from "@/data/abilities/abilities.json";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { Ability, TimelineEvent } from "@/types/planner";

const abilities = abilitiesJson as unknown as Ability[];

export function CommonUsagePreviewTable({
  usages,
  selectedIds,
  timelineEvents,
  onToggle,
  onToggleAll
}: {
  usages: ExternalActionUsage[];
  selectedIds: Set<string>;
  timelineEvents: TimelineEvent[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  const eventsById = new Map(timelineEvents.map((event) => [event.id, event]));

  return (
    <div className="max-h-[28rem] overflow-auto rounded-md border border-slate-800">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400">
          <tr>
            <th className="px-2 py-2">
              <input type="checkbox" checked={usages.length > 0 && selectedIds.size === usages.length} onChange={onToggleAll} aria-label="Select all common usage rows" />
            </th>
            <th className="px-2 py-2">Time</th>
            <th className="px-2 py-2">Ability</th>
            <th className="px-2 py-2">Job / player</th>
            <th className="px-2 py-2">Source</th>
            <th className="px-2 py-2">Nearest mechanic</th>
            <th className="px-2 py-2">Confidence</th>
            <th className="px-2 py-2">Match</th>
            <th className="px-2 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {usages.map((usage) => {
            const ability = abilities.find((item) => item.id === usage.abilityId);
            const event = usage.matchedTimelineEventId ? eventsById.get(usage.matchedTimelineEventId) : undefined;
            return (
              <tr key={usage.id} className="border-t border-slate-800">
                <td className="px-2 py-2">
                  <input type="checkbox" checked={selectedIds.has(usage.id)} onChange={() => onToggle(usage.id)} aria-label={`Select ${usage.abilityName}`} />
                </td>
                <td className="px-2 py-2 text-slate-200">{usage.displayTime}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2 text-slate-100">
                    {ability ? <img src={ability.iconPath} alt="" className="h-6 w-6 rounded border border-white/10" /> : <span className="h-6 w-6 rounded border border-slate-700 bg-slate-900" />}
                    <span>{usage.abilityName}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-slate-300">{[usage.sourceJob, usage.actorName].filter(Boolean).join(" / ") || "-"}</td>
                <td className="px-2 py-2 text-slate-300">{usage.reportCode ? `${usage.reportCode} #${usage.fightId}` : usage.source}</td>
                <td className="px-2 py-2 text-slate-300">
                  {event ? `${event.displayTime} ${event.name} (${usage.offsetFromNearestEvent! >= 0 ? "+" : ""}${usage.offsetFromNearestEvent}s)` : "Unmatched"}
                </td>
                <td className="px-2 py-2 text-slate-300">{usage.confidence}</td>
                <td className="px-2 py-2">{usage.abilityId ? <span className="text-emerald-200">matched</span> : <span className="text-amber-200">unmatched</span>}</td>
                <td className="px-2 py-2 text-slate-400">{usage.notes ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!usages.length ? <div className="p-6 text-center text-sm text-slate-500">No actions loaded yet.</div> : null}
    </div>
  );
}
