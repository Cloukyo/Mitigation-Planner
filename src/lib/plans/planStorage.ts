import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { generateShareSlug } from "@/lib/plans/shareLinks";
import type { StoredCommonUsage } from "@/lib/common-usage/commonUsageStorage";
import type { LoadedPlanSnapshot, PlanSnapshot, SavedPlanSummary } from "@/lib/plans/planTypes";
import type { Encounter, MitigationPlacement, Plan, Player, SourceLink, TimelineEvent } from "@/types/planner";

function isUuid(value?: string) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function now() {
  return new Date().toISOString();
}

function rowError(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error(String((error as { message: unknown }).message));
  }
  throw new Error("Supabase plan storage request failed.");
}

async function uniqueShareSlug(supabase: ReturnType<typeof getSupabaseServiceClient>) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const shareSlug = generateShareSlug();
    const { data, error } = await supabase.from("plans").select("id").eq("share_slug", shareSlug).maybeSingle();
    if (error) rowError(error);
    if (!data) return shareSlug;
  }
  throw new Error("Could not generate a unique share link.");
}

async function getPlanAccess(planId: string, userId?: string | null) {
  const supabase = getSupabaseServiceClient();
  const { data: plan, error: planError } = await supabase.from("plans").select("owner_id, visibility").eq("id", planId).maybeSingle();
  if (planError) rowError(planError);
  if (!plan) return { canRead: false, canEdit: false, access: "viewer" as const };
  if (plan.visibility === "public" || plan.visibility === "unlisted") {
    if (userId && plan.owner_id === userId) return { canRead: true, canEdit: true, access: "owner" as const };
    return { canRead: true, canEdit: false, access: "viewer" as const };
  }
  if (!userId) return { canRead: false, canEdit: false, access: "viewer" as const };
  if (plan.owner_id === userId) return { canRead: true, canEdit: true, access: "owner" as const };
  const { data: member, error: memberError } = await supabase.from("plan_members").select("role").eq("plan_id", planId).eq("user_id", userId).maybeSingle();
  if (memberError) rowError(memberError);
  if (!member) return { canRead: false, canEdit: false, access: "viewer" as const };
  return { canRead: true, canEdit: member.role === "owner" || member.role === "editor", access: member.role as "owner" | "editor" | "viewer" };
}

function remapCommonUsagePlanId(commonUsage: StoredCommonUsage | undefined, fromPlanId: string, toPlanId: string): StoredCommonUsage | undefined {
  if (!commonUsage) return undefined;
  return {
    ...commonUsage,
    layers: commonUsage.layers.map((layer) => (layer.planId === fromPlanId ? { ...layer, planId: toPlanId } : layer))
  };
}

function serializeCommonUsage(commonUsage: StoredCommonUsage | undefined, sourcePlanId: string, savedPlanId: string) {
  if (!commonUsage) return [];
  return commonUsage.layers
    .filter((layer) => layer.planId === sourcePlanId || layer.planId === savedPlanId)
    .map((layer) => {
      const source = commonUsage.sources.find((item) => item.id === layer.sourceId);
      const usages = commonUsage.usages.filter((usage) => usage.sourceId === layer.sourceId);
      const savedLayer = { ...layer, planId: savedPlanId };
      return {
        source_type: source?.sourceType ?? "common_usage",
        title: source?.notes ?? source?.sourceType ?? "Common usage overlay",
        enabled: savedLayer.enabled,
        opacity: savedLayer.opacity,
        filters: savedLayer.filters,
        timings: { source, layer: savedLayer, usages },
        source_reports: source?.reportCodes ?? null,
        status: "draft"
      };
    });
}

function deserializeCommonUsage(rows: Array<Record<string, any>>): StoredCommonUsage {
  return rows.reduce<StoredCommonUsage>(
    (store, row) => {
      const value = row.timings as { source?: any; layer?: any; usages?: any[] };
      if (value.source) store.sources.push(value.source);
      if (value.layer) store.layers.push(value.layer);
      if (Array.isArray(value.usages)) store.usages.push(...value.usages);
      return store;
    },
    { sources: [], usages: [], layers: [] }
  );
}

export async function savePlanSnapshot({
  snapshot,
  userId
}: {
  snapshot: PlanSnapshot;
  userId: string;
}) {
  const supabase = getSupabaseServiceClient();
  const timestamp = now();
  const existingPlanId = isUuid(snapshot.plan.id) ? snapshot.plan.id : undefined;
  let planId = existingPlanId;
  let shareSlug = snapshot.plan.shareSlug && !snapshot.plan.shareSlug.startsWith("local-") ? snapshot.plan.shareSlug : undefined;

  if (planId) {
    const access = await getPlanAccess(planId, userId);
    if (!access.canEdit) {
      planId = undefined;
      shareSlug = undefined;
    }
  }

  if (!shareSlug) shareSlug = await uniqueShareSlug(supabase);
  const planRow = {
    ...(planId ? { id: planId } : {}),
    owner_id: userId,
    title: snapshot.plan.title,
    encounter_template_id: snapshot.encounter.id ?? snapshot.plan.encounterId,
    encounter_name: snapshot.encounter.name ?? snapshot.plan.encounterName,
    share_slug: shareSlug,
    visibility: snapshot.plan.visibility ?? "private",
    prog_notes: snapshot.plan.progNotes ?? {},
    updated_at: timestamp,
    ...(planId ? {} : { created_at: timestamp })
  };

  const { data: savedPlan, error: planError } = await supabase.from("plans").upsert(planRow).select("*").single();
  if (planError) rowError(planError);
  planId = savedPlan.id;
  const savedPlanId = savedPlan.id as string;

  await supabase.from("profiles").upsert({ id: userId, updated_at: timestamp });
  await supabase.from("plan_members").upsert({ plan_id: savedPlanId, user_id: userId, role: "owner" }, { onConflict: "plan_id,user_id" });

  await Promise.all([
    supabase.from("plan_players").delete().eq("plan_id", savedPlanId),
    supabase.from("plan_timeline_events").delete().eq("plan_id", savedPlanId),
    supabase.from("plan_mitigation_placements").delete().eq("plan_id", savedPlanId),
    supabase.from("plan_common_usage_layers").delete().eq("plan_id", savedPlanId),
    supabase.from("plan_import_sources").delete().eq("plan_id", savedPlanId)
  ]);

  const playerIdMap = new Map<string, string>();
  const playerRows = snapshot.players.map((player) => {
    const id = isUuid(player.id) ? player.id : crypto.randomUUID();
    playerIdMap.set(player.id, id);
    return {
      id,
      plan_id: savedPlanId,
      slot: player.id,
      name: player.name,
      job: player.job,
      role: player.role,
      sort_order: player.sortOrder,
      updated_at: timestamp
    };
  });
  if (playerRows.length) {
    const { error } = await supabase.from("plan_players").insert(playerRows);
    if (error) rowError(error);
  }

  const eventRows = snapshot.encounter.events.map((event) => ({
    plan_id: savedPlanId,
    source_event_id: event.id,
    phase_id: event.phaseId,
    time_seconds: event.time,
    display_time: event.displayTime,
    name: event.name,
    ability_game_id: event.abilityGameId,
    damage_type: event.damageType,
    target_type: event.targetType,
    severity: event.severity,
    event_tag: event.eventTag,
    mitigation_relevant: event.mitigationRelevant,
    observed_damage: event.observedDamage ?? null,
    notes: event.notes,
    updated_at: timestamp
  }));
  if (eventRows.length) {
    const { error } = await supabase.from("plan_timeline_events").insert(eventRows);
    if (error) rowError(error);
  }

  const placementRows = snapshot.placements
    .map((placement) => ({
      id: isUuid(placement.id) ? placement.id : crypto.randomUUID(),
      plan_id: savedPlanId,
      player_id: playerIdMap.get(placement.playerId),
      ability_id: placement.abilityId,
      time_seconds: placement.time,
      locked: placement.locked ?? false,
      notes: placement.notes,
      source: "manual",
      created_by: userId,
      updated_at: timestamp
    }))
    .filter((row) => row.player_id);
  if (placementRows.length) {
    const { error } = await supabase.from("plan_mitigation_placements").insert(placementRows);
    if (error) rowError(error);
  }

  const savedCommonUsage = remapCommonUsagePlanId(snapshot.commonUsage, snapshot.plan.id, savedPlanId);
  const commonUsageRows = serializeCommonUsage(savedCommonUsage, savedPlanId, savedPlanId).map((row) => ({ ...row, plan_id: savedPlanId, updated_at: timestamp }));
  if (commonUsageRows.length) {
    const { error } = await supabase.from("plan_common_usage_layers").insert(commonUsageRows);
    if (error) rowError(error);
  }

  const sourceRows = (snapshot.encounter.sourceLinks ?? []).map((source) => ({
    plan_id: savedPlanId,
    source_type: source.type,
    label: source.label,
    url: source.url,
    metadata: {}
  }));
  if (sourceRows.length) {
    const { error } = await supabase.from("plan_import_sources").insert(sourceRows);
    if (error) rowError(error);
  }

  const players = snapshot.players.map((player) => ({ ...player, id: playerIdMap.get(player.id) ?? player.id, planId: savedPlanId }));
  const placements = snapshot.placements.map((placement) => ({
    ...placement,
    planId: savedPlanId,
    playerId: playerIdMap.get(placement.playerId) ?? placement.playerId,
    updatedAt: timestamp
  }));
  const plan: Plan = {
    ...snapshot.plan,
    id: savedPlanId,
    ownerId: userId,
    shareSlug,
    encounterId: savedPlan.encounter_template_id,
    encounterName: savedPlan.encounter_name,
    visibility: savedPlan.visibility,
    progNotes: savedPlan.prog_notes ?? undefined,
    updatedAt: savedPlan.updated_at,
    createdAt: savedPlan.created_at
  };
  const encounter: Encounter = { ...snapshot.encounter, id: savedPlan.encounter_template_id ?? snapshot.encounter.id, name: savedPlan.encounter_name ?? snapshot.encounter.name };
  return { snapshot: { version: 1 as const, plan, encounter, players, placements, commonUsage: savedCommonUsage }, access: "owner" as const, canEdit: true };
}

export async function loadPlanByShareSlug(shareSlug: string, userId?: string | null): Promise<LoadedPlanSnapshot | null> {
  const supabase = getSupabaseServiceClient();
  const { data: planRow, error: planError } = await supabase.from("plans").select("*").eq("share_slug", shareSlug).maybeSingle();
  if (planError) rowError(planError);
  if (!planRow) return null;
  const access = await getPlanAccess(planRow.id, userId);
  if (!access.canRead) return null;

  const [playersResult, eventsResult, placementsResult, commonUsageResult, sourcesResult] = await Promise.all([
    supabase.from("plan_players").select("*").eq("plan_id", planRow.id).order("sort_order"),
    supabase.from("plan_timeline_events").select("*").eq("plan_id", planRow.id).order("time_seconds"),
    supabase.from("plan_mitigation_placements").select("*").eq("plan_id", planRow.id).order("time_seconds"),
    supabase.from("plan_common_usage_layers").select("*").eq("plan_id", planRow.id).order("created_at"),
    supabase.from("plan_import_sources").select("*").eq("plan_id", planRow.id).order("created_at")
  ]);
  for (const result of [playersResult, eventsResult, placementsResult, commonUsageResult, sourcesResult]) {
    if (result.error) rowError(result.error);
  }

  const players: Player[] = (playersResult.data ?? []).map((row) => ({
    id: row.id,
    planId: planRow.id,
    name: row.name,
    job: row.job,
    role: row.role,
    sortOrder: row.sort_order ?? 0
  }));
  const events: TimelineEvent[] = (eventsResult.data ?? []).map((row) => ({
    id: row.source_event_id ?? row.id,
    phaseId: row.phase_id ?? undefined,
    time: Number(row.time_seconds),
    displayTime: row.display_time,
    name: row.name,
    abilityGameId: row.ability_game_id ?? undefined,
    damageType: row.damage_type,
    targetType: row.target_type,
    severity: row.severity,
    eventTag: row.event_tag ?? undefined,
    mitigationRelevant: row.mitigation_relevant ?? true,
    observedDamage: row.observed_damage ?? undefined,
    notes: row.notes ?? undefined,
    source: "supabase"
  }));
  const placements: MitigationPlacement[] = (placementsResult.data ?? []).map((row) => ({
    id: row.id,
    planId: planRow.id,
    abilityId: row.ability_id,
    playerId: row.player_id,
    time: Number(row.time_seconds),
    locked: row.locked ?? false,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    updatedAt: row.updated_at
  }));
  const sourceLinks: SourceLink[] = (sourcesResult.data ?? []).map((row) => ({
    label: row.label,
    url: row.url,
    type: row.source_type
  }));
  const duration = Math.max(480, ...events.map((event) => event.time + 30));
  const plan: Plan = {
    id: planRow.id,
    title: planRow.title,
    encounterName: planRow.encounter_name,
    encounterId: planRow.encounter_template_id,
    ownerId: planRow.owner_id,
    visibility: planRow.visibility,
    shareSlug: planRow.share_slug,
    progNotes: planRow.prog_notes ?? undefined,
    createdAt: planRow.created_at,
    updatedAt: planRow.updated_at
  };
  const encounter: Encounter = {
    id: planRow.encounter_template_id ?? "remote-plan",
    name: planRow.encounter_name ?? planRow.title,
    shortName: planRow.encounter_name ?? "Plan",
    phases: [{ id: `${planRow.id}-phase`, name: planRow.encounter_name ?? planRow.title, startTime: 0, endTime: duration }],
    events,
    sourceLinks
  };
  return {
    snapshot: {
      version: 1,
      plan,
      encounter,
      players,
      placements,
      commonUsage: deserializeCommonUsage(commonUsageResult.data ?? [])
    },
    access: access.access,
    canEdit: access.canEdit
  };
}

export async function listUserPlans(userId: string): Promise<SavedPlanSummary[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("plans").select("id,title,encounter_name,encounter_template_id,share_slug,visibility,updated_at,created_at").eq("owner_id", userId).order("updated_at", { ascending: false });
  if (error) rowError(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    encounterName: row.encounter_name,
    encounterTemplateId: row.encounter_template_id,
    shareSlug: row.share_slug,
    visibility: row.visibility,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  }));
}

export async function updatePlanVisibility(planId: string, visibility: Plan["visibility"], userId: string) {
  const access = await getPlanAccess(planId, userId);
  if (access.access !== "owner") throw new Error("Only the owner can change plan visibility.");
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("plans").update({ visibility, updated_at: now() }).eq("id", planId);
  if (error) rowError(error);
}

export async function deleteUserPlan(planId: string, userId: string) {
  const access = await getPlanAccess(planId, userId);
  if (access.access !== "owner") throw new Error("Only the owner can delete this plan.");
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) rowError(error);
}

export async function duplicatePlanFromShareSlug(shareSlug: string, userId: string) {
  const loaded = await loadPlanByShareSlug(shareSlug, userId);
  if (!loaded) throw new Error("Plan was not found or is private.");
  const timestamp = now();
  return savePlanSnapshot({
    userId,
    snapshot: {
      ...loaded.snapshot,
      plan: {
        ...loaded.snapshot.plan,
        id: `local-duplicate-${Date.now()}`,
        title: `${loaded.snapshot.plan.title} Copy`,
        ownerId: userId,
        visibility: "private",
        shareSlug: `local-copy-${Date.now()}`,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    }
  });
}
