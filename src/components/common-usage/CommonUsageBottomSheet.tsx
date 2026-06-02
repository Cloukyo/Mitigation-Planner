"use client";

import abilitiesJson from "@/data/abilities/abilities.json";
import { suggestedPlayersForUsage } from "@/lib/common-usage/convertUsageToPlacement";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { Ability, Player, TimelineEvent } from "@/types/planner";

const abilities = abilitiesJson as unknown as Ability[];

export function CommonUsageBottomSheet({
  usage,
  players,
  events,
  selectedPlayerId,
  onPlayerChange,
  onClose,
  onAddToPlan,
  onIgnore,
  onSnap,
  readOnly = false
}: {
  usage: ExternalActionUsage | null;
  players: Player[];
  events: TimelineEvent[];
  selectedPlayerId: string;
  onPlayerChange: (playerId: string) => void;
  onClose: () => void;
  onAddToPlan: () => void;
  onIgnore: () => void;
  onSnap: () => void;
  readOnly?: boolean;
}) {
  if (!usage) return null;
  const ability = abilities.find((item) => item.id === usage.abilityId);
  const suggested = suggestedPlayersForUsage(usage, players);
  const nearest = usage.matchedTimelineEventId ? events.find((event) => event.id === usage.matchedTimelineEventId) : undefined;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700 bg-slate-950 p-4 shadow-2xl md:left-auto md:right-4 md:bottom-4 md:w-96 md:rounded-lg md:border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {ability ? <img src={ability.iconPath} alt="" className="h-10 w-10 rounded border border-white/10" /> : <span className="h-10 w-10 rounded border border-slate-700 bg-slate-900" />}
          <div className="min-w-0">
            <h3 className="truncate font-bold text-white">{usage.abilityName}</h3>
            <p className="text-xs text-slate-400">
              {usage.displayTime} - {usage.sourceJob ?? usage.sourceRole ?? "unknown"} - {usage.confidence} confidence
            </p>
          </div>
        </div>
        <button className="rounded-md border border-slate-700 px-2 py-1 text-sm text-slate-300" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
        <div>Source: {usage.reportCode ? `${usage.reportCode} fight ${usage.fightId}` : usage.source}</div>
        <div>Nearest mechanic: {nearest ? `${nearest.displayTime} ${nearest.name} (${usage.offsetFromNearestEvent! >= 0 ? "+" : ""}${usage.offsetFromNearestEvent}s)` : "No nearby mechanic"}</div>
        {usage.notes ? <div className="mt-1 text-amber-100">{usage.notes}</div> : null}
      </div>
      <label className="mt-3 block text-xs font-semibold uppercase text-slate-500">Assign to player slot</label>
      <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" value={selectedPlayerId} onChange={(event) => onPlayerChange(event.target.value)}>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name} ({player.job}){suggested.some((item) => item.id === player.id) ? " - suggested" : ""}
          </option>
        ))}
      </select>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="min-h-11 rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={onAddToPlan} disabled={!usage.abilityId || readOnly}>
          {readOnly ? "Read-only" : "Add to plan"}
        </button>
        <button className="min-h-11 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60" onClick={onIgnore} disabled={readOnly}>
          Ignore
        </button>
        <button className="min-h-11 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60" onClick={onSnap} disabled={!nearest || readOnly}>
          Snap to mechanic
        </button>
        <button className="min-h-11 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" onClick={onClose}>
          Keep exact
        </button>
      </div>
    </div>
  );
}
