"use client";

import type { BossTimelineEventCandidate } from "@/lib/fflogs/types";
import type { DamageType, EventTarget, Severity } from "@/types/planner";

export function FFLogsTimelinePreview({
  candidates,
  selectedIds,
  onToggle,
  onUpdate
}: {
  candidates: BossTimelineEventCandidate[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BossTimelineEventCandidate>) => void;
}) {
  if (!candidates.length) {
    return <p className="text-sm text-slate-500">No timeline candidates loaded yet.</p>;
  }

  return (
    <div className="max-h-[26rem] overflow-auto rounded-md border border-slate-800">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="sticky top-0 z-10 bg-slate-950 text-slate-400">
          <tr>
            <th className="px-2 py-2">Use</th>
            <th className="px-2 py-2">Time</th>
            <th className="px-2 py-2">Ability / mechanic</th>
            <th className="px-2 py-2">Type</th>
            <th className="px-2 py-2">Targets</th>
            <th className="px-2 py-2">Median</th>
            <th className="px-2 py-2">Average</th>
            <th className="px-2 py-2">Damage</th>
            <th className="px-2 py-2">Target</th>
            <th className="px-2 py-2">Severity</th>
            <th className="px-2 py-2">Relevant</th>
            <th className="px-2 py-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.id} className="border-t border-slate-800">
              <td className="px-2 py-1">
                <input type="checkbox" checked={selectedIds.has(candidate.id)} onChange={() => onToggle(candidate.id)} />
              </td>
              <td className="px-2 py-1 text-slate-400">{candidate.displayTime}</td>
              <td className="px-2 py-1">
                <input
                  className="w-48 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
                  value={candidate.abilityName}
                  onChange={(event) => onUpdate(candidate.id, { abilityName: event.target.value })}
                />
              </td>
              <td className="px-2 py-1 text-slate-400">{candidate.eventType}</td>
              <td className="px-2 py-1">{candidate.observedDamage?.targetCount ?? "-"}</td>
              <td className="px-2 py-1">{candidate.observedDamage?.medianDamage?.toLocaleString() ?? "-"}</td>
              <td className="px-2 py-1">{candidate.observedDamage?.averageDamage?.toLocaleString() ?? "-"}</td>
              <td className="px-2 py-1">
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                  value={candidate.damageType}
                  onChange={(event) => onUpdate(candidate.id, { damageType: event.target.value as DamageType })}
                >
                  <option value="physical">physical</option>
                  <option value="magical">magical</option>
                  <option value="both">both</option>
                  <option value="darkness">darkness</option>
                  <option value="unknown">unknown</option>
                </select>
              </td>
              <td className="px-2 py-1">
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                  value={candidate.targetType}
                  onChange={(event) => onUpdate(candidate.id, { targetType: event.target.value as EventTarget })}
                >
                  <option value="party">party</option>
                  <option value="tank">tank</option>
                  <option value="single">single</option>
                  <option value="stack">stack</option>
                  <option value="spread">spread</option>
                  <option value="mechanic">mechanic</option>
                  <option value="unknown">unknown</option>
                </select>
              </td>
              <td className="px-2 py-1">
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                  value={candidate.severity ?? "unknown"}
                  onChange={(event) => onUpdate(candidate.id, { severity: event.target.value as Severity })}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="lethal">lethal</option>
                  <option value="unknown">unknown</option>
                </select>
              </td>
              <td className="px-2 py-1">
                <input type="checkbox" checked={candidate.mitigationRelevant} onChange={(event) => onUpdate(candidate.id, { mitigationRelevant: event.target.checked })} />
              </td>
              <td className="px-2 py-1 text-slate-400">{candidate.confidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
