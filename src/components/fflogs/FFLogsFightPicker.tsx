"use client";

import type { FFLogsFightSummary } from "@/lib/fflogs/types";
import { formatTime } from "@/lib/time";

export function FFLogsFightPicker({
  fights,
  selectedFightId,
  onSelect
}: {
  fights: FFLogsFightSummary[];
  selectedFightId?: number;
  onSelect: (fightId: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase text-slate-500">Fight / Pull</label>
      <select
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        value={selectedFightId ?? ""}
        onChange={(event) => onSelect(Number(event.target.value))}
      >
        <option value="" disabled>
          Select a fight
        </option>
        {fights.map((fight) => (
          <option key={fight.id} value={fight.id}>
            #{fight.id} {fight.name ?? fight.encounterName ?? "Unknown fight"} - {fight.kill ? "Kill" : `${fight.percentage?.toFixed(1) ?? "?"}%`} - {formatTime(fight.duration)}
          </option>
        ))}
      </select>
    </div>
  );
}
