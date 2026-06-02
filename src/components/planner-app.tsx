"use client";

import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileUp,
  Library,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Unlock,
  Upload
} from "lucide-react";
import { ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { CommonUsageFilters } from "@/components/common-usage/CommonUsageFilters";
import { CommonUsageImportModal } from "@/components/common-usage/CommonUsageImportModal";
import { CommonUsageLegend } from "@/components/common-usage/CommonUsageLegend";
import { CommonUsageRowOverlay } from "@/components/common-usage/CommonUsageRowOverlay";
import { FFLogsImportModal } from "@/components/fflogs/FFLogsImportModal";
import { PlanSaveStatus } from "@/components/plans/PlanSaveStatus";
import { SavePlanButton } from "@/components/plans/SavePlanButton";
import { SharePlanButton } from "@/components/plans/SharePlanButton";
import { EncounterTemplateManager } from "@/components/templates/EncounterTemplateManager";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { COMMON_USAGE_UPDATED_EVENT, getPlanCommonUsage, importCommonUsageJson, updateCommonUsageLayer, updateExternalActionUsage } from "@/lib/common-usage/commonUsageStorage";
import { hasDuplicateUsagePlacement } from "@/lib/common-usage/convertUsageToPlacement";
import type { CommonUsageLayer } from "@/lib/common-usage/commonUsageTypes";
import type { PlanSnapshot } from "@/lib/plans/planTypes";
import { abilities, usePlannerStore } from "@/store/planner-store";
import jobs from "@/data/jobs/jobs.json";
import { activePlacementsForEvent, buildWarnings, getAbility, isDamageTypeMismatch } from "@/lib/planner-logic";
import { clamp, formatTime, parseTime } from "@/lib/time";
import type { Ability, DamageType, Encounter, EventTag, EventTarget, MitigationPlacement, PlannerExport, Player, Severity, SourceLink, TimelineEvent, Warning } from "@/types/planner";

const eventTagOptions: Array<{ value: EventTag; label: string }> = [
  { value: "raidwide", label: "Raidwide" },
  { value: "tankbuster", label: "Tankbuster" },
  { value: "bleed", label: "Bleed" },
  { value: "stack", label: "Stack" },
  { value: "spread", label: "Spread" },
  { value: "transition", label: "Phase transition" },
  { value: "enrage", label: "Enrage" },
  { value: "downtime", label: "Downtime" },
  { value: "unknown", label: "Unknown" }
];

const quickEventButtons: Array<{ label: string; name: string; damageType: DamageType; targetType: EventTarget; severity: Severity; eventTag: EventTag; mitigationRelevant: boolean }> = [
  { label: "+ Raidwide", name: "Raidwide", damageType: "unknown", targetType: "party", severity: "high", eventTag: "raidwide", mitigationRelevant: true },
  { label: "+ Tankbuster", name: "Tankbuster", damageType: "unknown", targetType: "tank", severity: "high", eventTag: "tankbuster", mitigationRelevant: true },
  { label: "+ Stack", name: "Stack", damageType: "unknown", targetType: "stack", severity: "medium", eventTag: "stack", mitigationRelevant: true },
  { label: "+ Spread", name: "Spread", damageType: "unknown", targetType: "spread", severity: "medium", eventTag: "spread", mitigationRelevant: true },
  { label: "+ Bleed", name: "Bleed", damageType: "unknown", targetType: "party", severity: "high", eventTag: "bleed", mitigationRelevant: true },
  { label: "+ Phase Transition", name: "Phase Transition", damageType: "unknown", targetType: "mechanic", severity: "unknown", eventTag: "transition", mitigationRelevant: false },
  { label: "+ Unknown Mechanic", name: "Unknown Mechanic", damageType: "unknown", targetType: "unknown", severity: "unknown", eventTag: "unknown", mitigationRelevant: false }
];

function roleColor(role: string) {
  if (role === "tank") return "bg-sky-400";
  if (role === "healer") return "bg-emerald-400";
  if (role === "melee") return "bg-red-400";
  if (role === "ranged") return "bg-amber-300";
  if (role === "caster") return "bg-violet-400";
  return "bg-slate-400";
}

function abilityJobsLabel(ability: Ability) {
  return ability.jobs?.length ? ability.jobs.join("/") : ability.job;
}

function abilityTimingLabel(ability: Ability) {
  return `${ability.duration}s active • ${ability.cooldown}s cd`;
}

function abilityPlacementTimingLabel(ability: Ability) {
  return `${ability.duration}s • ${ability.cooldown}s cd`;
}

function effectColor(effectType: Ability["effectType"]) {
  if (effectType === "enemy_debuff") return "bg-amber-400/90 border-amber-200/60 text-amber-950";
  if (effectType === "shield") return "bg-cyan-300/90 border-cyan-100/60 text-cyan-950";
  if (effectType === "healing" || effectType === "regen") return "bg-emerald-300/90 border-emerald-100/60 text-emerald-950";
  if (effectType === "self_mitigation" || effectType === "invuln") return "bg-blue-300/90 border-blue-100/60 text-blue-950";
  return "bg-teal-300/90 border-teal-100/60 text-teal-950";
}

function placementClass(ability: Ability) {
  if (ability.role === "tank") return "border-sky-400/80 bg-sky-500/18 text-sky-50 ring-sky-300/20";
  if (ability.role === "healer") return "border-emerald-400/80 bg-emerald-500/18 text-emerald-50 ring-emerald-300/20";
  if (ability.role === "melee") return "border-orange-400/80 bg-orange-500/18 text-orange-50 ring-orange-300/20";
  if (ability.role === "ranged") return "border-amber-300/80 bg-amber-400/18 text-amber-50 ring-amber-200/20";
  if (ability.role === "caster") return "border-violet-400/80 bg-violet-500/18 text-violet-50 ring-violet-300/20";
  if (ability.effectType === "enemy_debuff") return "border-purple-400/80 bg-purple-500/18 text-purple-50 ring-purple-300/20";
  return "border-cyan-300/80 bg-cyan-500/18 text-cyan-50 ring-cyan-300/20";
}

function AbilityIcon({ ability }: { ability: Ability }) {
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-white/15 bg-slate-900">
      <img
        src={ability.iconPath || "/icons/actions/placeholder.png"}
        alt=""
        className="h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.src = "/icons/actions/placeholder.png";
        }}
      />
      {ability.missingIcon ? (
        <span className="absolute right-0 top-0 grid h-3.5 w-3.5 place-items-center bg-amber-400 text-[9px] font-black text-black">!</span>
      ) : null}
    </div>
  );
}

function formatPercent(value?: number | null) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "review";
}

function DraggableAbility({ ability }: { ability: Ability }) {
  const selectedAbilityId = usePlannerStore((state) => state.selectedAbilityId);
  const selectAbility = usePlannerStore((state) => state.selectAbility);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `ability:${ability.id}`,
    data: { type: "ability", abilityId: ability.id }
  });

  return (
    <button
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group flex w-full items-center gap-3 rounded-md border px-2.5 py-2 text-left transition ${
        selectedAbilityId === ability.id
          ? "border-teal-300 bg-teal-300/12"
          : "border-slate-700/80 bg-slate-950/35 hover:border-slate-500 hover:bg-slate-900"
      } ${isDragging ? "opacity-60" : ""}`}
      onClick={() => selectAbility(selectedAbilityId === ability.id ? null : ability.id)}
      title={`${ability.name}: ${ability.cooldown}s cooldown, ${ability.duration}s duration`}
      {...listeners}
      {...attributes}
    >
      <AbilityIcon ability={ability} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-100">{ability.name}</span>
        <span className="block truncate text-xs text-slate-400">{abilityJobsLabel(ability)} • {abilityTimingLabel(ability)}</span>
        <span className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase text-slate-500">
          <span>{ability.effectType.replaceAll("_", " ")}</span>
          {ability.needsManualReview ? <span className="text-amber-300">review</span> : null}
          {ability.missingIcon ? <span className="text-amber-300">missing icon</span> : null}
        </span>
      </span>
      <Plus className="h-4 w-4 text-slate-500 group-hover:text-teal-300" aria-hidden="true" />
    </button>
  );
}

function AbilityLibrary() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [job, setJob] = useState("all");
  const [kind, setKind] = useState("all");

  const filtered = abilities.filter((ability) => {
    const searchable = `${ability.name} ${ability.job} ${ability.jobs?.join(" ") ?? ""} ${ability.aliases?.join(" ") ?? ""} ${ability.role} ${ability.notes ?? ""}`;
    const matchesQuery = searchable.toLowerCase().includes(query.toLowerCase());
    const matchesRole = role === "all" || ability.role === role;
    const matchesJob = job === "all" || ability.jobs?.includes(job);
    const matchesKind =
      kind === "all" ||
      (kind === "raidwide" && ability.appliesToRaidwide) ||
      (kind === "tankbuster" && ability.appliesToTankbuster) ||
      (kind === "party" && ability.effectType === "party_mitigation") ||
      (kind === "self" && ability.effectType === "self_mitigation") ||
      (kind === "shield" && ability.effectType === "shield") ||
      (kind === "healing" && (ability.effectType === "healing" || ability.effectType === "regen")) ||
      (kind === "utility" && ability.effectType === "utility") ||
      (kind === "review" && ability.needsManualReview) ||
      (kind === "missingIcon" && ability.missingIcon);
    return matchesQuery && matchesRole && matchesJob && matchesKind;
  });

  return (
    <aside className="flex min-h-0 flex-col border-r border-slate-800 bg-slate-950/60 lg:w-80">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search abilities"
            aria-label="Search abilities"
          />
        </div>
        <select
          className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          aria-label="Filter abilities by role"
        >
          <option value="all">All roles</option>
          <option value="tank">Tank</option>
          <option value="healer">Healer</option>
          <option value="melee">Melee</option>
          <option value="ranged">Ranged</option>
          <option value="caster">Caster</option>
        </select>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            value={job}
            onChange={(event) => setJob(event.target.value)}
            aria-label="Filter abilities by job"
          >
            <option value="all">All jobs</option>
            {(jobs as Array<{ abbr: string; name: string }>).map((item) => (
              <option key={item.abbr} value={item.abbr}>
                {item.abbr} - {item.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            aria-label="Filter abilities by mitigation type"
          >
            <option value="all">All types</option>
            <option value="raidwide">Raidwide</option>
            <option value="tankbuster">Tankbuster</option>
            <option value="party">Party mit</option>
            <option value="self">Self mit</option>
            <option value="shield">Shields</option>
            <option value="healing">Healing</option>
            <option value="utility">Utility</option>
            <option value="review">Needs review</option>
            <option value="missingIcon">Missing icon</option>
          </select>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {filtered.map((ability) => (
          <DraggableAbility key={ability.id} ability={ability} />
        ))}
      </div>
    </aside>
  );
}

function Toolbar({ readOnly = false, remoteAccessLabel }: { readOnly?: boolean; remoteAccessLabel?: string }) {
  const plan = usePlannerStore((state) => state.plan);
  const encounter = usePlannerStore((state) => state.encounter);
  const players = usePlannerStore((state) => state.players);
  const placements = usePlannerStore((state) => state.placements);
  const saveStatus = usePlannerStore((state) => state.saveStatus);
  const zoom = usePlannerStore((state) => state.zoom);
  const setZoom = usePlannerStore((state) => state.setZoom);
  const snap = usePlannerStore((state) => state.snap);
  const setSnap = usePlannerStore((state) => state.setSnap);
  const importPlanJson = usePlannerStore((state) => state.importPlanJson);
  const resetLocalDraft = usePlannerStore((state) => state.resetLocalDraft);
  const activeTemplate = usePlannerStore((state) => state.activeTemplate);
  const loadTemplate = usePlannerStore((state) => state.loadTemplate);
  const updatePlanTitle = usePlannerStore((state) => state.updatePlanTitle);

  function exportJson() {
    const payload: PlannerExport = { version: 1, plan, encounter, players, placements };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mitigation-plan-local.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    if (readOnly) return;
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => importPlanJson(JSON.parse(text) as PlannerExport));
    event.target.value = "";
  }

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
      <div className="min-w-56 flex-1">
        <label className="flex max-w-md items-center gap-2">
          <Pencil className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <input
            className="w-full rounded border border-transparent bg-transparent px-1 text-base font-bold text-white hover:border-slate-700 focus:border-teal-300"
            value={plan.title}
            onChange={(event) => updatePlanTitle(event.target.value)}
            disabled={readOnly}
            aria-label="Plan title"
          />
        </label>
        <p className="text-xs text-slate-400">
          {encounter.shortName} - {readOnly ? `Shared ${remoteAccessLabel ?? "viewer"} reference` : "Planner draft"} - {saveStatus}
        </p>
      </div>
      <PlanSaveStatus />
      <SavePlanButton readOnly={readOnly} />
      <SharePlanButton readOnly={readOnly} />
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        value={activeTemplate}
        onChange={(event) => loadTemplate(event.target.value as "blank" | "fru")}
        disabled={readOnly}
        aria-label="Start from template"
      >
        <option value="blank">Blank custom timeline</option>
        <option value="fru">FRU sample timeline</option>
      </select>
      <label className="flex items-center gap-2 text-xs text-slate-400">
        Zoom
        <input
          type="range"
          min="1"
          max="18"
          step="0.1"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="Timeline zoom"
        />
      </label>
      <div className="inline-flex overflow-hidden rounded-md border border-slate-700 text-xs text-slate-300" aria-label="Zoom presets">
        <button className="px-2.5 py-2 hover:bg-slate-900" onClick={() => setZoom(1.4)}>
          Full
        </button>
        <button className="border-l border-slate-700 px-2.5 py-2 hover:bg-slate-900" onClick={() => setZoom(4)}>
          5m
        </button>
        <button className="border-l border-slate-700 px-2.5 py-2 hover:bg-slate-900" onClick={() => setZoom(15)}>
          1m
        </button>
      </div>
      <ThemeToggle />
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        value={snap}
        onChange={(event) => setSnap(event.target.value as "second" | "five" | "event")}
        aria-label="Snap mode"
      >
        <option value="second">Snap 1s</option>
        <option value="five">Snap 5s</option>
        <option value="event">Snap event</option>
      </select>
      <button className="inline-flex items-center gap-2 rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black" onClick={exportJson}>
        <Download className="h-4 w-4" aria-hidden="true" />
        Export
      </button>
      <button
        className="inline-flex items-center gap-2 rounded-md border border-teal-300/50 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-300/10"
        onClick={() => window.dispatchEvent(new CustomEvent("open-fflogs-import"))}
        disabled={readOnly}
      >
        <FileUp className="h-4 w-4" aria-hidden="true" />
        FFLogs
      </button>
      <button
        className="inline-flex items-center gap-2 rounded-md border border-amber-300/50 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/10"
        onClick={() => window.dispatchEvent(new CustomEvent("open-common-usage-import"))}
        disabled={readOnly}
      >
        <Library className="h-4 w-4" aria-hidden="true" />
        Common Usage
      </button>
      <Link className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" href="/templates">
        <Library className="h-4 w-4" aria-hidden="true" />
        Templates
      </Link>
      <Link className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" href="/plans">
        <Save className="h-4 w-4" aria-hidden="true" />
        Saved Plans
      </Link>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">
        <Upload className="h-4 w-4" aria-hidden="true" />
        Import
        <input className="sr-only" type="file" accept="application/json" onChange={handleImport} disabled={readOnly} />
      </label>
      <button className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-60" onClick={resetLocalDraft} disabled={readOnly}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reset
      </button>
    </header>
  );
}

function BossEvent({
  event,
  left,
  top,
  activeCount,
  hasMismatch
}: {
  event: TimelineEvent;
  left: number;
  top: number;
  activeCount: number;
  hasMismatch: boolean;
}) {
  const severityClass =
    event.severity === "lethal"
      ? "border-danger bg-danger/25 text-red-100"
      : event.severity === "high"
        ? "border-amber-400 bg-amber-400/18 text-amber-100"
        : "border-slate-600 bg-slate-800/95 text-slate-200";
  const title = `${event.displayTime} ${event.name} - ${event.damageType} ${event.targetType} ${event.severity}; ${activeCount} active mitigation${activeCount === 1 ? "" : "s"}`;

  return (
    <div
      className={`absolute z-10 flex h-[154px] w-[46px] flex-col items-center rounded-md border px-1.5 py-1.5 text-[11px] shadow-lg shadow-black/20 ${severityClass}`}
      style={{ left, top }}
      title={title}
    >
      <span className="shrink-0 rounded bg-slate-950/45 px-1 text-[10px] font-bold leading-4">{event.displayTime}</span>
      <div className="mt-1 flex min-h-0 flex-1 items-center justify-center">
        <span className="timeline-event-label max-h-[104px] overflow-hidden text-center text-xs font-semibold leading-4">{event.name}</span>
      </div>
      <span className="mt-1 shrink-0 rounded bg-slate-950/40 px-1 text-[10px] leading-4">{activeCount}x</span>
      {hasMismatch ? <AlertTriangle className="absolute bottom-1 right-1 h-3.5 w-3.5" aria-label="Damage type mismatch" /> : null}
    </div>
  );
}

function PlacementBar({
  placement,
  ability,
  left,
  width,
  conflict,
  readOnly = false,
  onDelete,
  onDuplicate,
  onToggleLock
}: {
  placement: MitigationPlacement;
  ability: Ability;
  left: number;
  width: number;
  conflict: boolean;
  readOnly?: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placement:${placement.id}`,
    disabled: placement.locked || readOnly,
    data: { type: "placement", placementId: placement.id }
  });
  const pixelsPerSecond = width / Math.max(ability.duration, 1);
  const activeWidth = Math.max(width, 150);
  const cooldownWidth = Math.max(ability.cooldown * pixelsPerSecond, activeWidth + 72);
  const readyAt = placement.time + ability.cooldown;
  const title = `${ability.name}: ${abilityTimingLabel(ability)}, active ${formatTime(placement.time)}-${formatTime(
    placement.time + ability.duration
  )}, ready ${formatTime(readyAt)}${conflict ? ", cooldown conflict" : ""}`;

  function stopControlEvent(event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        left,
        width: cooldownWidth,
        transform: CSS.Translate.toString(transform)
      }}
      className={`group absolute top-1.5 z-20 h-9 ${isDragging ? "opacity-70" : ""}`}
      data-placement="true"
      title={title}
    >
      <div className="absolute top-1 h-7 rounded border border-dashed border-slate-500/45 bg-slate-700/20" style={{ left: activeWidth, right: 0 }} aria-hidden="true" />
      <span
        className="absolute top-1 grid h-7 place-items-center rounded border border-slate-500/50 bg-slate-950/80 px-2 text-[10px] font-semibold text-slate-300"
        style={{ left: Math.max(cooldownWidth - 58, activeWidth + 4), width: 56 }}
      >
        {formatTime(readyAt)}
      </span>
      <div
        className={`absolute left-0 top-0 flex h-9 items-center gap-2 overflow-hidden rounded-md border px-1.5 text-xs font-bold shadow shadow-black/25 backdrop-blur-sm ${placementClass(
          ability
        )} ${placement.locked ? "opacity-80" : ""} ${conflict ? "ring-2 ring-danger" : "ring-1"}`}
        style={{ width: activeWidth }}
        onClick={(event) => {
          event.stopPropagation();
          setDetailsOpen((open) => !open);
        }}
        {...listeners}
        {...attributes}
      >
        <AbilityIcon ability={ability} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12px] font-black text-current">{ability.name}</span>
          <span className="block truncate text-[10px] font-semibold opacity-85">{abilityPlacementTimingLabel(ability)}</span>
        </span>
        {conflict ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-label="Conflict" /> : null}
        {!readOnly ? (
          <>
            <button
              onPointerDown={stopControlEvent}
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate();
              }}
              className="rounded p-0.5 opacity-0 transition hover:bg-black/15 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Duplicate ${ability.name}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onPointerDown={stopControlEvent}
              onClick={(event) => {
                event.stopPropagation();
                onToggleLock();
              }}
              className="rounded p-0.5 opacity-0 transition hover:bg-black/15 group-hover:opacity-100 focus:opacity-100"
              aria-label={placement.locked ? `Unlock ${ability.name}` : `Lock ${ability.name}`}
            >
              {placement.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
            <button
              onPointerDown={stopControlEvent}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="rounded p-0.5 opacity-0 transition hover:bg-black/15 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Delete ${ability.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
      </div>
      {detailsOpen ? (
        <div className="absolute left-0 top-11 z-50 w-64 rounded-md border border-slate-700 bg-slate-950/98 p-3 text-xs text-slate-200 shadow-2xl shadow-black/40">
          <div className="flex items-start gap-3">
            <AbilityIcon ability={ability} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{ability.name}</div>
              <div className="text-slate-400">{abilityJobsLabel(ability)}</div>
            </div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div><dt className="text-slate-500">Active</dt><dd>{ability.duration}s</dd></div>
            <div><dt className="text-slate-500">Cooldown</dt><dd>{ability.cooldown}s</dd></div>
            <div><dt className="text-slate-500">Effect</dt><dd>{ability.effectType.replaceAll("_", " ")}</dd></div>
            <div><dt className="text-slate-500">Damage</dt><dd>{ability.damageType}</dd></div>
          </dl>
          {placement.notes ? <p className="mt-2 rounded border border-slate-700 bg-slate-900 p-2 text-slate-300">{placement.notes}</p> : null}
          {ability.notes ? <p className="mt-2 text-slate-400">{ability.notes}</p> : null}
          {conflict ? <p className="mt-2 rounded border border-danger/40 bg-danger/10 p-2 text-red-100">Cooldown conflict on this placement.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function TimelineRow({
  player,
  players,
  encounter,
  planId,
  width,
  warnings,
  readOnly = false
}: {
  player: Player;
  players: Player[];
  encounter: Encounter;
  planId: string;
  width: number;
  warnings: Warning[];
  readOnly?: boolean;
}) {
  const zoom = usePlannerStore((state) => state.zoom);
  const selectedAbilityId = usePlannerStore((state) => state.selectedAbilityId);
  const placements = usePlannerStore((state) => state.placements);
  const addPlacement = usePlannerStore((state) => state.addPlacement);
  const deletePlacement = usePlannerStore((state) => state.deletePlacement);
  const duplicatePlacement = usePlannerStore((state) => state.duplicatePlacement);
  const toggleLock = usePlannerStore((state) => state.toggleLock);
  const { setNodeRef } = useDroppable({
    id: `row:${player.id}`,
    data: { type: "row", playerId: player.id }
  });

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (readOnly) return;
    if (!selectedAbilityId || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-placement='true']")) return;
    if ((event.target as HTMLElement).closest("[data-common-usage-marker='true']")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const time = (event.clientX - rect.left + event.currentTarget.scrollLeft) / zoom;
    addPlacement(selectedAbilityId, player.id, time);
  }

  return (
    <div className="grid grid-cols-[150px_1fr] border-b border-slate-800">
      <div className="flex h-12 items-center gap-2 border-r border-slate-800 bg-slate-950/70 px-3">
        <span className={`h-2.5 w-2.5 rounded-full ${roleColor(player.role)}`} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-200">{player.name}</span>
          <span className="block text-xs text-slate-500">{player.job}</span>
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="timeline-grid relative h-12 cursor-crosshair"
        style={{ width, ["--minor-grid" as string]: `${zoom * 10}px`, ["--major-grid" as string]: `${zoom * 60}px` }}
        onPointerDown={handlePointerDown}
      >
        {placements
          .filter((placement) => placement.playerId === player.id)
          .map((placement) => {
            const ability = getAbility(abilities, placement.abilityId);
            if (!ability) return null;
            const conflict = warnings.some((warning) => warning.placementId === placement.id && warning.title === "Cooldown conflict");
            return (
              <PlacementBar
                key={placement.id}
                placement={placement}
                ability={ability}
                left={placement.time * zoom}
                width={ability.duration * zoom}
                conflict={conflict}
                readOnly={readOnly}
                onDelete={() => deletePlacement(placement.id)}
                onDuplicate={() => duplicatePlacement(placement.id)}
                onToggleLock={() => toggleLock(placement.id)}
              />
            );
          })}
        <CommonUsageRowOverlay encounter={encounter} planId={planId} player={player} players={players} placements={placements} zoom={zoom} readOnly={readOnly} />
      </div>
    </div>
  );
}

function TimelineCanvas({ warnings, readOnly = false }: { warnings: Warning[]; readOnly?: boolean }) {
  const plan = usePlannerStore((state) => state.plan);
  const encounter = usePlannerStore((state) => state.encounter);
  const players = usePlannerStore((state) => state.players);
  const placements = usePlannerStore((state) => state.placements);
  const zoom = usePlannerStore((state) => state.zoom);
  const selectedPlayerId = usePlannerStore((state) => state.selectedPlayerId);

  const duration = Math.max(...encounter.phases.map((phase) => phase.endTime), ...encounter.events.map((event) => event.time + 30));
  const width = Math.max(960, duration * zoom);
  const mobilePlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0];
  const visiblePlayers = typeof window !== "undefined" && window.innerWidth < 720 ? [mobilePlayer] : players;

  return (
    <section className="min-w-0 flex-1 overflow-hidden bg-ink">
      <div className="h-full overflow-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[150px_1fr] border-b border-slate-800">
            <div className="border-r border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-semibold uppercase text-slate-500">Events</div>
            <div className="timeline-grid relative h-44" style={{ width, ["--minor-grid" as string]: `${zoom * 10}px`, ["--major-grid" as string]: `${zoom * 60}px` }}>
              {encounter.phases.map((phase) => (
                <div
                  key={phase.id}
                  className="absolute top-0 h-full border-l border-teal-300/50 px-2 pt-1 text-xs font-semibold text-teal-200"
                  style={{ left: phase.startTime * zoom }}
                >
                  {phase.name}
                </div>
              ))}
              {encounter.events.map((event, index) => {
                const active = activePlacementsForEvent(abilities, placements, event);
                const hasMismatch = active.some((placement) => {
                  const ability = getAbility(abilities, placement.abilityId);
                  return ability ? isDamageTypeMismatch(ability, event) : false;
                });
                return <BossEvent key={event.id} event={event} left={event.time * zoom} top={12} activeCount={active.length} hasMismatch={hasMismatch} />;
              })}
            </div>
          </div>
          {visiblePlayers.map((player) => (
            <TimelineRow key={player.id} player={player} players={players} encounter={encounter} planId={plan.id} width={width} warnings={warnings} readOnly={readOnly} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Inspector({ warnings, readOnly = false }: { warnings: Warning[]; readOnly?: boolean }) {
  const plan = usePlannerStore((state) => state.plan);
  const encounter = usePlannerStore((state) => state.encounter);
  const placements = usePlannerStore((state) => state.placements);
  const players = usePlannerStore((state) => state.players);
  const selectedPlayerId = usePlannerStore((state) => state.selectedPlayerId);
  const selectedAbilityId = usePlannerStore((state) => state.selectedAbilityId);
  const selectPlayer = usePlannerStore((state) => state.selectPlayer);
  const updatePlayerJob = usePlannerStore((state) => state.updatePlayerJob);
  const importTimelineText = usePlannerStore((state) => state.importTimelineText);
  const addTimelineEvent = usePlannerStore((state) => state.addTimelineEvent);
  const updateTimelineEvent = usePlannerStore((state) => state.updateTimelineEvent);
  const duplicateTimelineEvent = usePlannerStore((state) => state.duplicateTimelineEvent);
  const deleteTimelineEvent = usePlannerStore((state) => state.deleteTimelineEvent);
  const updatePlanProgNotes = usePlannerStore((state) => state.updatePlanProgNotes);
  const addSourceLink = usePlannerStore((state) => state.addSourceLink);
  const [timelineText, setTimelineText] = useState("00:12 Raidwide | magical | party | high\n00:38 Tankbuster | physical | tank | high");
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceDraft, setSourceDraft] = useState({ label: "", url: "" });
  const [commonUsageLayers, setCommonUsageLayers] = useState<CommonUsageLayer[]>([]);
  const [eventDraft, setEventDraft] = useState({
    time: "0:30",
    name: "Raidwide",
    damageType: "magical",
    targetType: "party",
    severity: "high",
    eventTag: "raidwide",
    notes: "",
    mitigationRelevant: true
  });
  const selectedAbility = abilities.find((ability) => ability.id === selectedAbilityId);
  const isDmu = plan.encounterId === "dmu" || encounter.id === "dmu" || encounter.shortName === "DMU";

  useEffect(() => {
    function loadCommonUsage() {
      setCommonUsageLayers(getPlanCommonUsage(plan.id, encounter.id).layers);
    }
    loadCommonUsage();
    window.addEventListener(COMMON_USAGE_UPDATED_EVENT, loadCommonUsage);
    return () => window.removeEventListener(COMMON_USAGE_UPDATED_EVENT, loadCommonUsage);
  }, [encounter.id, plan.id]);

  const coverage = encounter.events
    .filter((event) => event.mitigationRelevant)
    .map((event) => ({
      event,
      active: activePlacementsForEvent(abilities, placements, event)
    }));

  function parseDraftSeconds() {
    const seconds = eventDraft.time.includes(":")
      ? eventDraft.time.split(":").reduce((total, part) => total * 60 + Number(part), 0)
      : Number(eventDraft.time);
    return Number.isFinite(seconds) ? seconds : null;
  }

  function addDraftEvent(preset?: Partial<typeof eventDraft>) {
    if (readOnly) return;
    const draft = { ...eventDraft, ...preset };
    const seconds = draft.time.includes(":") ? draft.time.split(":").reduce((total, part) => total * 60 + Number(part), 0) : Number(draft.time);
    if (!Number.isFinite(seconds) || !draft.name.trim()) return;
    addTimelineEvent({
      time: seconds,
      name: draft.name.trim(),
      damageType: draft.damageType as DamageType,
      targetType: draft.targetType as EventTarget,
      severity: draft.severity as Severity,
      eventTag: draft.eventTag as EventTag,
      mitigationRelevant: draft.mitigationRelevant,
      notes: draft.notes.trim() || undefined
    });
    const nextSeconds = Math.max(0, seconds + 30);
    setEventDraft((current) => ({
      ...current,
      time: formatTime(nextSeconds),
      name: "",
      notes: ""
    }));
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    addDraftEvent();
  }

  function addProgSourceLink() {
    if (readOnly || !sourceDraft.url.trim()) return;
    addSourceLink({
      label: sourceDraft.label.trim() || sourceDraft.url.trim(),
      url: sourceDraft.url.trim(),
      type: "manual"
    });
    setSourceDraft({ label: "", url: "" });
  }

  return (
    <aside className="flex min-h-0 flex-col border-l border-slate-800 bg-slate-950/65 lg:w-96">
      <div className="border-b border-slate-800 p-4">
        <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Mobile selected row</label>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          value={selectedPlayerId}
          onChange={(event) => selectPlayer(event.target.value)}
          disabled={readOnly}
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name} ({player.job})
            </option>
          ))}
        </select>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Party Jobs</h2>
          <div className="space-y-2">
            {players.map((player) => (
              <label key={player.id} className="grid grid-cols-[1fr_7rem] items-center gap-2 text-sm">
                <span className="truncate text-slate-300">{player.name}</span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                  value={player.job}
                  onChange={(event) => {
                    if (readOnly) return;
                    const nextJob = (jobs as Array<{ abbr: string; role: Player["role"] }>).find((item) => item.abbr === event.target.value);
                    if (nextJob) updatePlayerJob(player.id, nextJob.abbr, nextJob.role);
                  }}
                  disabled={readOnly}
                  aria-label={`${player.name} job`}
                >
                  {(jobs as Array<{ abbr: string; name: string }>).map((item) => (
                    <option key={item.abbr} value={item.abbr}>
                      {item.abbr}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Common Usage Overlay</h2>
          <p className="mb-3 text-xs text-slate-500">Log-derived reference timings. Ghost markers do not count as mitigation until added to the plan.</p>
          <div className="space-y-3">
            <CommonUsageLegend />
            {commonUsageLayers[0] ? (
              <>
                {commonUsageLayers.length > 1 ? (
                  <p className="rounded-md border border-sky-300/30 bg-sky-300/10 p-2 text-xs text-sky-50">
                    Controls apply to all {commonUsageLayers.length} loaded common usage references.
                  </p>
                ) : null}
                <CommonUsageFilters
                  layer={{
                    ...commonUsageLayers[0],
                    enabled: commonUsageLayers.some((layer) => layer.enabled)
                  }}
                onChange={(layer) => {
                  if (readOnly) return;
                  const nextLayers = commonUsageLayers.map((item) => ({
                      ...item,
                      enabled: layer.enabled,
                      opacity: layer.opacity,
                      filters: layer.filters
                    }));
                    nextLayers.forEach(updateCommonUsageLayer);
                    setCommonUsageLayers(nextLayers);
                  }}
                />
              </>
            ) : (
              <button
                className="w-full rounded-md border border-amber-300/50 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/10"
                onClick={() => window.dispatchEvent(new CustomEvent("open-common-usage-import"))}
                disabled={readOnly}
              >
                Import common usage
              </button>
            )}
          </div>
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Day-One Timeline Builder</h2>
          {isDmu ? (
            <p className="mb-3 rounded-md border border-cyan-300/30 bg-cyan-300/10 p-2 text-xs text-cyan-50">
              FFLogs import will become useful after your group or public groups upload DMU logs. For now, add mechanics as they are discovered.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={timeInputRef}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={eventDraft.time}
              onChange={(event) => setEventDraft((draft) => ({ ...draft, time: event.target.value }))}
              onKeyDown={handleDraftKeyDown}
              disabled={readOnly}
              placeholder="0:30"
              aria-label="Event timestamp"
            />
            <input
              ref={nameInputRef}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={eventDraft.name}
              onChange={(event) => setEventDraft((draft) => ({ ...draft, name: event.target.value }))}
              onKeyDown={handleDraftKeyDown}
              disabled={readOnly}
              placeholder="Event name"
              aria-label="Event name"
            />
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={eventDraft.damageType}
              onChange={(event) => setEventDraft((draft) => ({ ...draft, damageType: event.target.value }))}
              onKeyDown={handleDraftKeyDown}
              disabled={readOnly}
              aria-label="Damage type"
            >
              <option value="physical">Physical</option>
              <option value="magical">Magical</option>
              <option value="both">Both</option>
              <option value="darkness">Darkness</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={eventDraft.targetType}
              onChange={(event) => setEventDraft((draft) => ({ ...draft, targetType: event.target.value }))}
              onKeyDown={handleDraftKeyDown}
              disabled={readOnly}
              aria-label="Target type"
            >
              <option value="party">Party</option>
              <option value="tank">Tank</option>
              <option value="single">Single</option>
              <option value="stack">Stack</option>
              <option value="spread">Spread</option>
              <option value="mechanic">Mechanic</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={eventDraft.severity}
              onChange={(event) => setEventDraft((draft) => ({ ...draft, severity: event.target.value }))}
              onKeyDown={handleDraftKeyDown}
              disabled={readOnly}
              aria-label="Severity"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="lethal">Lethal</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              value={eventDraft.eventTag}
              onChange={(event) => setEventDraft((draft) => ({ ...draft, eventTag: event.target.value }))}
              onKeyDown={handleDraftKeyDown}
              disabled={readOnly}
              aria-label="Event tag"
            >
              {eventTagOptions.map((tag) => (
                <option key={tag.value} value={tag.value}>
                  {tag.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={eventDraft.mitigationRelevant}
                onChange={(event) => setEventDraft((draft) => ({ ...draft, mitigationRelevant: event.target.checked }))}
                disabled={readOnly}
              />
              Warn
            </label>
          </div>
          <textarea
            className="mt-2 h-16 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
            value={eventDraft.notes}
            onChange={(event) => setEventDraft((draft) => ({ ...draft, notes: event.target.value }))}
            onKeyDown={handleDraftKeyDown}
            disabled={readOnly}
            placeholder="Event notes, unresolved mechanic details, or callouts"
            aria-label="Event notes"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {quickEventButtons.map((preset) => (
              <button
                key={preset.label}
                className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                onClick={() => addDraftEvent(preset)}
                disabled={readOnly}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            disabled={readOnly}
            onClick={() => addDraftEvent()}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add event
          </button>
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Selected Ability</h2>
          {selectedAbility ? (
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex items-start gap-3">
                <AbilityIcon ability={selectedAbility} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-100">{selectedAbility.name}</div>
                  <div className="text-xs text-slate-400">{selectedAbility.jobs?.join(", ") || selectedAbility.job}</div>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-slate-500">Cooldown</dt><dd>{selectedAbility.cooldown}s</dd></div>
                <div><dt className="text-slate-500">Duration</dt><dd>{selectedAbility.duration}s</dd></div>
                <div><dt className="text-slate-500">Mitigation</dt><dd>{formatPercent(selectedAbility.mitigationValue)}</dd></div>
                <div><dt className="text-slate-500">Damage</dt><dd>{selectedAbility.damageType}</dd></div>
                <div><dt className="text-slate-500">Target</dt><dd>{selectedAbility.targetType}</dd></div>
                <div><dt className="text-slate-500">Effect</dt><dd>{selectedAbility.effectType.replaceAll("_", " ")}</dd></div>
              </dl>
              {selectedAbility.shieldValue ? <p className="mt-2 text-xs text-cyan-200">Shield: {formatPercent(selectedAbility.shieldValue)}</p> : null}
              {selectedAbility.healingPotency ? <p className="mt-2 text-xs text-emerald-200">Healing potency: {selectedAbility.healingPotency}</p> : null}
              {selectedAbility.regenPotency ? <p className="mt-2 text-xs text-emerald-200">Regen potency: {selectedAbility.regenPotency}</p> : null}
              {selectedAbility.notes ? <p className="mt-2 text-xs text-slate-400">{selectedAbility.notes}</p> : null}
              {selectedAbility.needsManualReview ? <p className="mt-2 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">Needs manual metadata review.</p> : null}
              {selectedAbility.missingIcon ? <p className="mt-2 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">Missing official icon; using placeholder.</p> : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select an ability to inspect metadata.</p>
          )}
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Warnings</h2>
          <div className="space-y-2">
            {warnings.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                <Check className="h-4 w-4" aria-hidden="true" />
                No local warnings
              </div>
            ) : (
              warnings.slice(0, 8).map((warning) => (
                <div
                  key={warning.id}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    warning.severity === "danger"
                      ? "border-danger/50 bg-danger/10 text-red-100"
                      : warning.severity === "warning"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
                        : "border-slate-600 bg-slate-900 text-slate-200"
                  }`}
                >
                  <div className="font-semibold">{warning.title}</div>
                  <div className="text-xs opacity-80">{warning.detail}</div>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Timeline Events</h2>
          <div className="space-y-2">
            {encounter.events.map((event) => {
              const active = activePlacementsForEvent(abilities, placements, event);
              return (
              <div key={event.id} className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
                <div className="grid grid-cols-[4.25rem_1fr] gap-2">
                  <input
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                    value={event.displayTime}
                    disabled={readOnly}
                    onChange={(change) => {
                      const nextTime = parseTime(change.target.value);
                      updateTimelineEvent(event.id, {
                        displayTime: change.target.value,
                        ...(nextTime !== null ? { time: nextTime } : {})
                      });
                    }}
                    aria-label={`${event.name} time`}
                  />
                  <input
                    className="min-w-0 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-100"
                    value={event.name}
                    disabled={readOnly}
                    onChange={(change) => updateTimelineEvent(event.id, { name: change.target.value })}
                    aria-label={`${event.displayTime} event name`}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200" value={event.damageType} disabled={readOnly} onChange={(change) => updateTimelineEvent(event.id, { damageType: change.target.value as DamageType })}>
                    <option value="physical">Physical</option>
                    <option value="magical">Magical</option>
                    <option value="both">Both</option>
                    <option value="darkness">Darkness</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200" value={event.targetType} disabled={readOnly} onChange={(change) => updateTimelineEvent(event.id, { targetType: change.target.value as EventTarget })}>
                    <option value="party">Party</option>
                    <option value="tank">Tank</option>
                    <option value="stack">Stack</option>
                    <option value="spread">Spread</option>
                    <option value="single">Single</option>
                    <option value="mechanic">Mechanic</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200" value={event.severity} disabled={readOnly} onChange={(change) => updateTimelineEvent(event.id, { severity: change.target.value as Severity })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="lethal">Lethal</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <select className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200" value={event.eventTag ?? "unknown"} disabled={readOnly} onChange={(change) => updateTimelineEvent(event.id, { eventTag: change.target.value as EventTag })}>
                    {eventTagOptions.map((tag) => (
                      <option key={tag.value} value={tag.value}>
                        {tag.label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="mt-2 h-14 w-full resize-none rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
                  value={event.notes ?? ""}
                  disabled={readOnly}
                  onChange={(change) => updateTimelineEvent(event.id, { notes: change.target.value || undefined })}
                  placeholder="Notes, mechanic unresolveds, positioning, or callouts"
                  aria-label={`${event.name} notes`}
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={event.mitigationRelevant} disabled={readOnly} onChange={(change) => updateTimelineEvent(event.id, { mitigationRelevant: change.target.checked })} />
                    Mitigation relevant
                  </label>
                  <span>{active.length} active mitigation{active.length === 1 ? "" : "s"}</span>
                  {!readOnly ? (
                    <span className="flex gap-1">
                      <button className="rounded border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800" onClick={() => duplicateTimelineEvent(event.id)}>
                        Duplicate
                      </button>
                      <button className="rounded border border-danger/50 px-2 py-1 text-danger hover:bg-danger/10" onClick={() => deleteTimelineEvent(event.id)} aria-label={`Delete ${event.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : null}
                </div>
                {event.observedDamage ? (
                  <div className="mt-2 rounded border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-100">
                    Observed median {event.observedDamage.medianDamage.toLocaleString()} / avg {event.observedDamage.averageDamage.toLocaleString()} / range{" "}
                    {event.observedDamage.minDamage.toLocaleString()}-{event.observedDamage.maxDamage.toLocaleString()} / targets {event.observedDamage.targetCount} / samples{" "}
                    {event.observedDamage.sampleSize}. {event.observedDamage.warning}
                  </div>
                ) : null}
              </div>
              );
            })}
          </div>
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Paste Timeline</h2>
          <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload TXT/CSV timeline
            <input
              className="sr-only"
              type="file"
              accept=".txt,.csv,.log,text/plain,text/csv"
              onChange={(event) => {
                if (readOnly) return;
                const file = event.target.files?.[0];
                if (!file) return;
                file.text().then(setTimelineText);
                event.target.value = "";
              }}
              disabled={readOnly}
            />
          </label>
          <textarea
            className="h-28 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
            value={timelineText}
            onChange={(event) => setTimelineText(event.target.value)}
            disabled={readOnly}
            aria-label="Paste timeline text"
          />
          <button
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
            onClick={() => {
              if (!readOnly) importTimelineText(timelineText);
            }}
            disabled={readOnly}
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Import pasted/uploaded events
          </button>
        </section>
        <section className="border-b border-slate-800 p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Prog Notes</h2>
          <div className="space-y-2">
            <textarea
              className="h-20 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
              value={plan.progNotes?.currentPhase ?? ""}
              disabled={readOnly}
              onChange={(event) => updatePlanProgNotes({ ...(plan.progNotes ?? {}), currentPhase: event.target.value })}
              placeholder="Current phase notes"
              aria-label="Current phase notes"
            />
            <textarea
              className="h-20 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
              value={plan.progNotes?.unresolvedMechanics ?? ""}
              disabled={readOnly}
              onChange={(event) => updatePlanProgNotes({ ...(plan.progNotes ?? {}), unresolvedMechanics: event.target.value })}
              placeholder="Unresolved mechanics"
              aria-label="Unresolved mechanics"
            />
            <textarea
              className="h-20 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
              value={plan.progNotes?.mitigationQuestions ?? ""}
              disabled={readOnly}
              onChange={(event) => updatePlanProgNotes({ ...(plan.progNotes ?? {}), mitigationQuestions: event.target.value })}
              placeholder="Mitigation questions"
              aria-label="Mitigation questions"
            />
            <textarea
              className="h-20 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
              value={plan.progNotes?.sourceLinks ?? ""}
              disabled={readOnly}
              onChange={(event) => updatePlanProgNotes({ ...(plan.progNotes ?? {}), sourceLinks: event.target.value })}
              placeholder="Raidplans, pastebins, guides, or stream notes"
              aria-label="Prog source links"
            />
            {!readOnly ? (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={sourceDraft.label}
                  onChange={(event) => setSourceDraft((draft) => ({ ...draft, label: event.target.value }))}
                  placeholder="Source label"
                  aria-label="Source label"
                />
                <input
                  className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={sourceDraft.url}
                  onChange={(event) => setSourceDraft((draft) => ({ ...draft, url: event.target.value }))}
                  placeholder="https://..."
                  aria-label="Source URL"
                />
                <button className="rounded-md border border-teal-300/50 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-300/10" onClick={addProgSourceLink}>
                  Add
                </button>
              </div>
            ) : null}
          </div>
        </section>
        <section className="p-4">
          <h2 className="mb-3 text-sm font-bold text-white">Sources</h2>
          <div className="space-y-2">
            {encounter.sourceLinks.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="block rounded-md border border-slate-800 px-3 py-2 text-sm text-teal-200 hover:bg-slate-900">
                {source.label}
              </a>
            ))}
          </div>
        </section>
        {!readOnly ? <EncounterTemplateManager /> : null}
      </div>
    </aside>
  );
}

function MobileHeader({ readOnly = false }: { readOnly?: boolean }) {
  const plan = usePlannerStore((state) => state.plan);
  const saveStatus = usePlannerStore((state) => state.saveStatus);

  return (
    <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 px-3 py-2 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{plan.title}</div>
          <div className="text-xs text-slate-400">{readOnly ? "read-only shared plan" : saveStatus}</div>
        </div>
        <ThemeToggle />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <SavePlanButton readOnly={readOnly} />
        <SharePlanButton readOnly={readOnly} />
      </div>
    </div>
  );
}

export function PlannerApp({
  initialSnapshot,
  readOnly = false,
  remoteAccessLabel
}: {
  initialSnapshot?: PlanSnapshot;
  readOnly?: boolean;
  remoteAccessLabel?: string;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const loadFromStorage = usePlannerStore((state) => state.loadFromStorage);
  const hydratePlanSnapshot = usePlannerStore((state) => state.hydratePlanSnapshot);
  const plan = usePlannerStore((state) => state.plan);
  const encounter = usePlannerStore((state) => state.encounter);
  const players = usePlannerStore((state) => state.players);
  const placements = usePlannerStore((state) => state.placements);
  const zoom = usePlannerStore((state) => state.zoom);
  const addPlacement = usePlannerStore((state) => state.addPlacement);
  const movePlacement = usePlannerStore((state) => state.movePlacement);
  const importTimelineEvents = usePlannerStore((state) => state.importTimelineEvents);
  const [fflogsOpen, setFflogsOpen] = useState(false);
  const [commonUsageOpen, setCommonUsageOpen] = useState(false);
  const warnings = useMemo(() => buildWarnings(abilities, players, encounter, placements), [encounter, placements, players]);

  useEffect(() => {
    if (initialSnapshot) {
      hydratePlanSnapshot(initialSnapshot, readOnly ? "read-only" : "saved");
      if (initialSnapshot.commonUsage) importCommonUsageJson(initialSnapshot.commonUsage);
      return;
    }
    loadFromStorage();
  }, [hydratePlanSnapshot, initialSnapshot, loadFromStorage, readOnly]);

  useEffect(() => {
    const open = () => setFflogsOpen(true);
    window.addEventListener("open-fflogs-import", open);
    return () => window.removeEventListener("open-fflogs-import", open);
  }, []);

  useEffect(() => {
    const open = () => setCommonUsageOpen(true);
    window.addEventListener("open-common-usage-import", open);
    return () => window.removeEventListener("open-common-usage-import", open);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("import") === "fflogs") setFflogsOpen(true);
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    if (readOnly) return;
    const over = event.over;
    if (!over || !String(over.id).startsWith("row:")) return;
    const playerId = String(over.id).replace("row:", "");
    const translated = event.active.rect.current.translated;
    if (!translated) return;
    const rowLeft = over.rect.left;
    const data = event.active.data.current;

    if (data?.type === "ability") {
      const centerX = translated.left + translated.width / 2;
      const time = clamp((centerX - rowLeft) / zoom, 0, 9999);
      addPlacement(data.abilityId, playerId, time);
    }

    if (data?.type === "placement") {
      const time = clamp((translated.left - rowLeft) / zoom, 0, 9999);
      movePlacement(data.placementId, time, playerId);
    }

    if (data?.type === "common-usage" && data.usage?.abilityId) {
      const time = clamp((translated.left + translated.width / 2 - rowLeft) / zoom, 0, 9999);
      if (!hasDuplicateUsagePlacement({ ...data.usage, timestamp: time }, playerId, placements)) {
        addPlacement(data.usage.abilityId, playerId, time);
      }
      updateExternalActionUsage({ ...data.usage, importStatus: "accepted" });
    }
  }

  return (
    <DndContext id="mitigation-planner-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-ink/75 text-slate-100">
        <MobileHeader readOnly={readOnly} />
        <div className="hidden md:block">
          <Toolbar readOnly={readOnly} remoteAccessLabel={remoteAccessLabel} />
        </div>
        <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[20rem_minmax(0,1fr)] lg:grid-cols-[20rem_minmax(0,1fr)_24rem]">
          <AbilityLibrary />
          <TimelineCanvas warnings={warnings} readOnly={readOnly} />
          <Inspector warnings={warnings} readOnly={readOnly} />
        </main>
        <footer className="border-t border-slate-800 bg-slate-950/85 px-4 py-2 text-[11px] text-slate-500">
          FINAL FANTASY XIV and all related official game assets, icons, names, and data are property of Square Enix. This is an unofficial fan project and is not affiliated with Square Enix.
        </footer>
        {!readOnly ? <FFLogsImportModal open={fflogsOpen} onClose={() => setFflogsOpen(false)} onImport={importTimelineEvents} /> : null}
        {!readOnly ? <CommonUsageImportModal open={commonUsageOpen} onClose={() => setCommonUsageOpen(false)} plan={plan} encounter={encounter} /> : null}
      </div>
    </DndContext>
  );
}
