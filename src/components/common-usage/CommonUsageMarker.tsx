"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import abilitiesJson from "@/data/abilities/abilities.json";
import type { ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import type { Ability } from "@/types/planner";

const abilities = abilitiesJson as unknown as Ability[];

export function CommonUsageMarker({
  usage,
  left,
  top = 174,
  opacity,
  draggable = false,
  onSelect
}: {
  usage: ExternalActionUsage;
  left: number;
  top?: number;
  opacity: number;
  draggable?: boolean;
  onSelect: (usage: ExternalActionUsage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `common-usage:${usage.id}`,
    disabled: !draggable || !usage.abilityId,
    data: { type: "common-usage", usage }
  });
  const ability = abilities.find((item) => item.id === usage.abilityId);
  const details = ability
    ? `${usage.displayTime} ${ability.name} - ${ability.duration}s active • ${ability.cooldown}s cd (${usage.sourceJob ?? usage.sourceRole ?? "unknown"})`
    : `${usage.displayTime} ${usage.abilityName} (${usage.sourceJob ?? usage.sourceRole ?? "unknown"})`;
  const stateClass =
    usage.importStatus === "accepted"
      ? "border-emerald-200 bg-emerald-300/45"
      : usage.confidence === "low" || !usage.abilityId
        ? "border-amber-200 bg-amber-300/40"
        : "border-teal-200 bg-teal-300/40";

  return (
    <button
      ref={setNodeRef}
      className={`absolute z-30 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border shadow-lg shadow-black/30 transition hover:scale-110 ${stateClass} ${isDragging ? "opacity-60" : ""}`}
      style={{ left, top, opacity, transform: CSS.Translate.toString(transform) }}
      onClick={() => onSelect(usage)}
      data-common-usage-marker="true"
      title={details}
      aria-label={`Common usage ${usage.abilityName} at ${usage.displayTime}`}
      {...listeners}
      {...attributes}
    >
      {ability ? <img src={ability.iconPath} alt="" className="h-6 w-6 rounded" /> : <span className="text-xs font-bold text-black">?</span>}
    </button>
  );
}
