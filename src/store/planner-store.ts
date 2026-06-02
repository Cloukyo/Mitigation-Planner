"use client";

import { create } from "zustand";
import abilitiesJson from "@/data/abilities/abilities.json";
import { blankEncounter, blankPlan, sampleEncounter, samplePlacements, samplePlan, samplePlayers } from "@/data/sample";
import type { EncounterTemplate } from "@/lib/catalogue/catalogueTypes";
import { parseTimelineText } from "@/lib/timeline-import";
import { formatTime } from "@/lib/time";
import type { Ability, DamageType, Encounter, EventTag, EventTarget, MitigationPlacement, Plan, PlannerExport, Player, Severity, SourceLink, TimelineEvent } from "@/types/planner";

const STORAGE_KEY = "mitigation-planner-local-draft-v2";

type PlannerState = {
  plan: Plan;
  encounter: Encounter;
  players: Player[];
  placements: MitigationPlacement[];
  selectedAbilityId: string | null;
  selectedPlayerId: string;
  zoom: number;
  snap: "second" | "five" | "event";
  saveStatus: "saved" | "saving" | "local" | "failed" | "read-only";
  hasLoadedStorage: boolean;
  activeTemplate: string;
  selectAbility: (abilityId: string | null) => void;
  selectPlayer: (playerId: string) => void;
  updatePlanTitle: (title: string) => void;
  updatePlanVisibility: (visibility: Plan["visibility"]) => void;
  updatePlayerJob: (playerId: string, job: string, role: Player["role"]) => void;
  loadTemplate: (template: "blank" | "fru") => void;
  startFromEncounterTemplate: (template: EncounterTemplate) => void;
  setZoom: (zoom: number) => void;
  setSnap: (snap: PlannerState["snap"]) => void;
  addTimelineEvent: (event: {
    time: number;
    name: string;
    damageType: DamageType;
    targetType: EventTarget;
    severity: Severity;
    eventTag?: EventTag;
    mitigationRelevant: boolean;
    notes?: string;
  }) => void;
  updateTimelineEvent: (eventId: string, patch: Partial<Omit<TimelineEvent, "id">>) => void;
  duplicateTimelineEvent: (eventId: string) => void;
  deleteTimelineEvent: (eventId: string) => void;
  updatePlanProgNotes: (progNotes: NonNullable<Plan["progNotes"]>) => void;
  addSourceLink: (source: SourceLink) => void;
  addPlacement: (abilityId: string, playerId: string, time: number) => void;
  movePlacement: (placementId: string, time: number, playerId?: string) => void;
  deletePlacement: (placementId: string) => void;
  duplicatePlacement: (placementId: string) => void;
  toggleLock: (placementId: string) => void;
  updatePlacementNotes: (placementId: string, notes: string) => void;
  importTimelineText: (text: string) => void;
  importTimelineEvents: (events: Encounter["events"], templateName?: string) => void;
  importPlanJson: (value: PlannerExport) => void;
  hydratePlanSnapshot: (value: PlannerExport, saveStatus?: PlannerState["saveStatus"]) => void;
  setSaveStatus: (saveStatus: PlannerState["saveStatus"]) => void;
  resetLocalDraft: () => void;
  loadFromStorage: () => void;
};

function now() {
  return new Date().toISOString();
}

function snapTime(state: PlannerState, rawTime: number) {
  if (state.snap === "five") return Math.max(0, Math.round(rawTime / 5) * 5);
  if (state.snap === "event") {
    const nearest = state.encounter.events.reduce(
      (best, event) => (Math.abs(event.time - rawTime) < Math.abs(best.time - rawTime) ? event : best),
      state.encounter.events[0]
    );
    return nearest?.time ?? Math.round(rawTime);
  }
  return Math.max(0, Math.round(rawTime));
}

function persist(state: PlannerState) {
  if (typeof window === "undefined") return;
  const exportValue: PlannerExport = {
    version: 1,
    plan: state.plan,
    encounter: state.encounter,
    players: state.players,
    placements: state.placements
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportValue));
}

function saveThenMarkSaved(get: () => PlannerState, set: (partial: Partial<PlannerState>) => void) {
  persist(get());
  setTimeout(() => set({ saveStatus: "saved" }), 250);
}

function freshPlan(plan: Plan) {
  return { ...plan, updatedAt: now() };
}

function phaseForTemplate(template: EncounterTemplate) {
  return {
    id: `${template.id}-phase`,
    name: template.shortName ?? template.name,
    startTime: 0,
    endTime: Math.max(480, ...template.events.map((event) => event.time + 30))
  };
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  plan: blankPlan,
  encounter: blankEncounter,
  players: samplePlayers,
  placements: [],
  selectedAbilityId: null,
  selectedPlayerId: samplePlayers[0].id,
  zoom: 2.8,
  snap: "second",
  saveStatus: "local",
  hasLoadedStorage: false,
  activeTemplate: "blank",
  selectAbility: (abilityId) => set({ selectedAbilityId: abilityId }),
  selectPlayer: (playerId) => set({ selectedPlayerId: playerId }),
  updatePlanTitle: (title) => {
    set((state) => ({
      plan: { ...state.plan, title, updatedAt: now() },
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  updatePlanVisibility: (visibility) => {
    set((state) => ({
      plan: { ...state.plan, visibility, updatedAt: now() },
      saveStatus: "saved"
    }));
    persist(get());
  },
  updatePlayerJob: (playerId, job, role) => {
    set((state) => ({
      players: state.players.map((player) => (player.id === playerId ? { ...player, job, role } : player)),
      saveStatus: "saving",
      plan: { ...state.plan, updatedAt: now() }
    }));
    saveThenMarkSaved(get, set);
  },
  loadTemplate: (template) => {
    const next =
      template === "fru"
        ? {
            plan: freshPlan(samplePlan),
            encounter: sampleEncounter,
            placements: samplePlacements,
            activeTemplate: "fru" as const
          }
        : {
            plan: freshPlan(blankPlan),
            encounter: blankEncounter,
            placements: [],
            activeTemplate: "blank" as const
          };
    set({
      ...next,
      selectedAbilityId: null,
      selectedPlayerId: samplePlayers[0].id,
      saveStatus: "saving"
    });
    saveThenMarkSaved(get, set);
  },
  startFromEncounterTemplate: (template) => {
    const timestamp = now();
    const planId = `plan-${template.id}-${Date.now()}`;
    set({
      plan: {
        ...blankPlan,
        id: planId,
        title: `${template.shortName ?? template.name} Plan`,
        encounterName: template.name,
        encounterId: template.encounterCatalogueItemId,
        shareSlug: `local-${template.id}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        progNotes:
          template.encounterCatalogueItemId === "dmu"
            ? {
                currentPhase: "Day-one prog",
                unresolvedMechanics: "",
                mitigationQuestions: "",
                sourceLinks: ""
              }
            : blankPlan.progNotes
      },
      encounter: {
        id: template.encounterCatalogueItemId,
        name: template.name,
        shortName: template.shortName ?? template.name,
        phases: [phaseForTemplate(template)],
        events: template.events.map((event) => ({ ...event })),
        sourceLinks: template.sourceLinks?.map((source) => ({ ...source })) ?? []
      },
      players: samplePlayers.map((player) => ({ ...player, planId })),
      placements: [],
      selectedAbilityId: null,
      selectedPlayerId: samplePlayers[0].id,
      activeTemplate: template.id,
      saveStatus: "saving"
    });
    saveThenMarkSaved(get, set);
  },
  setZoom: (zoom) => set({ zoom }),
  setSnap: (snap) => set({ snap }),
  addTimelineEvent: (event) => {
    set((state) => {
      const nextEvents = [
        ...state.encounter.events,
        {
          ...event,
          id: `event-${crypto.randomUUID()}`,
          displayTime: formatTime(event.time),
          source: "manual"
        }
      ].sort((a, b) => a.time - b.time);
      const lastTime = Math.max(...nextEvents.map((item) => item.time), state.encounter.phases.at(-1)?.endTime ?? 480);
      return {
        encounter: {
          ...state.encounter,
          phases:
            state.encounter.phases.length > 0
              ? state.encounter.phases.map((phase, index, phases) =>
                  index === phases.length - 1 ? { ...phase, endTime: Math.max(phase.endTime, lastTime + 30) } : phase
                )
              : [{ id: "custom-phase", name: "Custom Fight", startTime: 0, endTime: lastTime + 30 }],
          events: nextEvents
        },
        saveStatus: "saving"
      };
    });
    saveThenMarkSaved(get, set);
  },
  updateTimelineEvent: (eventId, patch) => {
    set((state) => {
      const events = state.encounter.events
        .map((event) => {
          if (event.id !== eventId) return event;
          const nextTime = typeof patch.time === "number" ? patch.time : event.time;
          return {
            ...event,
            ...patch,
            time: nextTime,
            displayTime: patch.displayTime ?? formatTime(nextTime)
          };
        })
        .sort((a, b) => a.time - b.time);
      return {
        encounter: { ...state.encounter, events },
        plan: { ...state.plan, updatedAt: now() },
        saveStatus: "saving"
      };
    });
    saveThenMarkSaved(get, set);
  },
  duplicateTimelineEvent: (eventId) => {
    const event = get().encounter.events.find((item) => item.id === eventId);
    if (!event) return;
    get().addTimelineEvent({
      time: event.time + 5,
      name: `${event.name} Copy`,
      damageType: event.damageType,
      targetType: event.targetType,
      severity: event.severity,
      eventTag: event.eventTag,
      mitigationRelevant: event.mitigationRelevant,
      notes: event.notes
    });
  },
  deleteTimelineEvent: (eventId) => {
    set((state) => ({
      encounter: { ...state.encounter, events: state.encounter.events.filter((event) => event.id !== eventId) },
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  updatePlanProgNotes: (progNotes) => {
    set((state) => ({
      plan: { ...state.plan, progNotes, updatedAt: now() },
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  addSourceLink: (source) => {
    set((state) => ({
      encounter: { ...state.encounter, sourceLinks: [...state.encounter.sourceLinks, source] },
      plan: { ...state.plan, updatedAt: now() },
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  addPlacement: (abilityId, playerId, time) => {
    set((state) => ({
      placements: [
        ...state.placements,
        {
          id: `place-${crypto.randomUUID()}`,
          planId: state.plan.id,
          abilityId,
          playerId,
          time: snapTime(state, time),
          updatedAt: now()
        }
      ],
      saveStatus: "saving",
      plan: { ...state.plan, updatedAt: now() }
    }));
    saveThenMarkSaved(get, set);
  },
  movePlacement: (placementId, time, playerId) => {
    set((state) => ({
      placements: state.placements.map((placement) =>
        placement.id === placementId && !placement.locked
          ? { ...placement, time: snapTime(state, time), playerId: playerId ?? placement.playerId, updatedAt: now() }
          : placement
      ),
      saveStatus: "saving",
      plan: { ...state.plan, updatedAt: now() }
    }));
    saveThenMarkSaved(get, set);
  },
  deletePlacement: (placementId) => {
    set((state) => ({
      placements: state.placements.filter((placement) => placement.id !== placementId),
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  duplicatePlacement: (placementId) => {
    const placement = get().placements.find((item) => item.id === placementId);
    if (!placement) return;
    get().addPlacement(placement.abilityId, placement.playerId, placement.time + 5);
  },
  toggleLock: (placementId) => {
    set((state) => ({
      placements: state.placements.map((placement) =>
        placement.id === placementId ? { ...placement, locked: !placement.locked, updatedAt: now() } : placement
      ),
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  updatePlacementNotes: (placementId, notes) => {
    set((state) => ({
      placements: state.placements.map((placement) =>
        placement.id === placementId ? { ...placement, notes, updatedAt: now() } : placement
      ),
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  importTimelineText: (text) => {
    const events = parseTimelineText(text);
    set((state) => ({
      encounter: {
        ...state.encounter,
        phases: [{ id: "imported", name: "Imported Timeline", startTime: 0, endTime: Math.max(480, ...events.map((event) => event.time + 30)) }],
        events
      },
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  importTimelineEvents: (events, templateName) => {
    set((state) => ({
      plan: { ...state.plan, title: templateName ? `${templateName} Plan` : state.plan.title, encounterName: templateName ?? state.plan.encounterName, updatedAt: now() },
      encounter: {
        ...state.encounter,
        name: templateName ?? state.encounter.name,
        shortName: templateName ? "FFLogs" : state.encounter.shortName,
        phases: [{ id: "fflogs-import", name: templateName ?? "FFLogs Import", startTime: 0, endTime: Math.max(480, ...events.map((event) => event.time + 30)) }],
        events
      },
      placements: [],
      activeTemplate: "blank",
      saveStatus: "saving"
    }));
    saveThenMarkSaved(get, set);
  },
  importPlanJson: (value) => {
    set({
      plan: value.plan,
      encounter: value.encounter,
      players: value.players,
      placements: value.placements,
      saveStatus: "saving"
    });
    saveThenMarkSaved(get, set);
  },
  hydratePlanSnapshot: (value, saveStatus = "saved") => {
    set({
      plan: value.plan,
      encounter: value.encounter,
      players: value.players,
      placements: value.placements,
      selectedPlayerId: value.players[0]?.id ?? samplePlayers[0].id,
      hasLoadedStorage: true,
      activeTemplate: value.encounter.id,
      saveStatus
    });
  },
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  resetLocalDraft: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    set({
      plan: blankPlan,
      encounter: blankEncounter,
      players: samplePlayers,
      placements: [],
      selectedAbilityId: null,
      selectedPlayerId: samplePlayers[0].id,
      activeTemplate: "blank",
      saveStatus: "local"
    });
  },
  loadFromStorage: () => {
    if (typeof window === "undefined" || get().hasLoadedStorage) return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ hasLoadedStorage: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PlannerExport;
      set({
        plan: parsed.plan,
        encounter: parsed.encounter,
        players: parsed.players,
        placements: parsed.placements,
        selectedPlayerId: parsed.players[0]?.id ?? samplePlayers[0].id,
        hasLoadedStorage: true,
        activeTemplate: parsed.encounter.id === "fru-dev" ? "fru" : "blank",
        saveStatus: "saved"
      });
    } catch {
      set({ hasLoadedStorage: true });
    }
  }
}));

export const abilities = abilitiesJson as unknown as Ability[];
