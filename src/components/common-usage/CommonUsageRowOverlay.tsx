"use client";

import { useEffect, useMemo, useState } from "react";
import { CommonUsageBottomSheet } from "@/components/common-usage/CommonUsageBottomSheet";
import { CommonUsageMarker } from "@/components/common-usage/CommonUsageMarker";
import { filterCommonUsage } from "@/lib/common-usage/filterCommonUsage";
import { hasDuplicateUsagePlacement, suggestedPlayersForUsage } from "@/lib/common-usage/convertUsageToPlacement";
import { COMMON_USAGE_UPDATED_EVENT, getPlanCommonUsage, updateExternalActionUsage } from "@/lib/common-usage/commonUsageStorage";
import type { CommonUsageLayer, ExternalActionUsage } from "@/lib/common-usage/commonUsageTypes";
import { usePlannerStore } from "@/store/planner-store";
import type { Encounter, MitigationPlacement, Player } from "@/types/planner";

export function CommonUsageRowOverlay({
  encounter,
  planId,
  player,
  players,
  placements,
  zoom,
  readOnly = false
}: {
  encounter: Encounter;
  planId: string;
  player: Player;
  players: Player[];
  placements: MitigationPlacement[];
  zoom: number;
  readOnly?: boolean;
}) {
  const addPlacement = usePlannerStore((state) => state.addPlacement);
  const [layers, setLayers] = useState<CommonUsageLayer[]>([]);
  const [usages, setUsages] = useState<ExternalActionUsage[]>([]);
  const [selected, setSelected] = useState<ExternalActionUsage | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(player.id);

  useEffect(() => {
    function load() {
      const data = getPlanCommonUsage(planId, encounter.id);
      setLayers(data.layers);
      setUsages(data.usages);
    }
    load();
    window.addEventListener(COMMON_USAGE_UPDATED_EVENT, load);
    return () => window.removeEventListener(COMMON_USAGE_UPDATED_EVENT, load);
  }, [encounter.id, planId]);

  const visible = useMemo(
    () =>
      layers.flatMap((layer) =>
        filterCommonUsage(
          usages.filter((usage) => usage.sourceId === layer.sourceId),
          layer
        )
          .filter((usage) => suggestedPlayersForUsage(usage, players).some((candidate) => candidate.id === player.id))
          .map((usage) => ({ usage, layer }))
      ),
    [layers, player.id, players, usages]
  );

  function updateUsage(next: ExternalActionUsage) {
    updateExternalActionUsage(next);
    setUsages((items) => items.map((item) => (item.id === next.id ? next : item)));
    setSelected(next);
  }

  function addSelectedToPlan(useMatchedEventTime = false) {
    if (readOnly) return;
    if (!selected?.abilityId || !selectedPlayerId) return;
    const nearest = selected.matchedTimelineEventId ? encounter.events.find((event) => event.id === selected.matchedTimelineEventId) : undefined;
    const time = useMatchedEventTime && nearest ? nearest.time : selected.timestamp;
    if (!hasDuplicateUsagePlacement({ ...selected, timestamp: time }, selectedPlayerId, placements)) {
      addPlacement(selected.abilityId, selectedPlayerId, time);
    }
    updateUsage({ ...selected, importStatus: "accepted" });
  }

  if (!visible.length) return null;

  return (
    <>
      {visible.map(({ usage, layer }) => (
        <CommonUsageMarker
          key={usage.id}
          usage={usage}
          left={usage.timestamp * zoom}
          top={8}
          opacity={layer.opacity}
          draggable={!readOnly}
          onSelect={(next) => {
            setSelectedPlayerId(player.id);
            setSelected(next);
          }}
        />
      ))}
      <CommonUsageBottomSheet
        usage={selected}
        players={players}
        events={encounter.events}
        selectedPlayerId={selectedPlayerId}
        onPlayerChange={setSelectedPlayerId}
        onClose={() => setSelected(null)}
        onAddToPlan={() => addSelectedToPlan(false)}
        onSnap={() => addSelectedToPlan(true)}
        onIgnore={() => {
          if (readOnly) return;
          if (!selected) return;
          updateUsage({ ...selected, importStatus: "ignored" });
          setSelected(null);
        }}
        readOnly={readOnly}
      />
    </>
  );
}
