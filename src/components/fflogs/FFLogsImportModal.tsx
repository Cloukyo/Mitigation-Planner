"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { FFLogsDamageProfilePreview } from "@/components/fflogs/FFLogsDamageProfilePreview";
import { FFLogsFightPicker } from "@/components/fflogs/FFLogsFightPicker";
import { FFLogsImportWarnings } from "@/components/fflogs/FFLogsImportWarnings";
import { FFLogsTimelinePreview } from "@/components/fflogs/FFLogsTimelinePreview";
import { saveEncounterTemplate } from "@/lib/catalogue/catalogueStorage";
import { formatTime } from "@/lib/time";
import type { BossTimelineEventCandidate, DamageProfileEvent, FFLogsFightSummary, FFLogsReport } from "@/lib/fflogs/types";
import type { EncounterTemplate } from "@/lib/catalogue/catalogueTypes";
import type { TimelineEvent } from "@/types/planner";

type ImportMode = "timeline" | "timeline_and_damage" | "damage";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "FFLogs request failed.");
  return payload as T;
}

export function FFLogsImportModal({
  open,
  onClose,
  onImport
}: {
  open: boolean;
  onClose: () => void;
  onImport: (events: TimelineEvent[], name?: string) => void;
}) {
  const [reportInput, setReportInput] = useState("");
  const [report, setReport] = useState<FFLogsReport | null>(null);
  const [selectedFightId, setSelectedFightId] = useState<number | undefined>();
  const [mode, setMode] = useState<ImportMode>("timeline_and_damage");
  const [candidates, setCandidates] = useState<BossTimelineEventCandidate[]>([]);
  const [damageProfile, setDamageProfile] = useState<DamageProfileEvent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFight = useMemo(() => report?.fights.find((fight) => fight.id === selectedFightId), [report, selectedFightId]);

  if (!open) return null;

  async function loadReport(input = reportInput) {
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ report: FFLogsReport; selectedFightId?: number }>("/api/fflogs/report", { report: input });
      setReportInput(input);
      setReport(payload.report);
      setSelectedFightId(payload.selectedFightId ?? payload.report.fights[0]?.id);
      setCandidates([]);
      setDamageProfile([]);
      setSelectedIds(new Set());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load FFLogs report.");
    } finally {
      setLoading(false);
    }
  }

  async function importPreview() {
    if (!selectedFightId) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "damage") {
        const payload = await postJson<{ damageProfile: DamageProfileEvent[] }>("/api/fflogs/import-damage-profile", {
          report: reportInput,
          fightId: selectedFightId
        });
        setDamageProfile(payload.damageProfile);
        setCandidates([]);
        setSelectedIds(new Set());
      } else {
        const payload = await postJson<{
          candidates: BossTimelineEventCandidate[];
          damageProfile: DamageProfileEvent[];
        }>("/api/fflogs/import-timeline", {
          report: reportInput,
          fightId: selectedFightId,
          includeDamage: mode === "timeline_and_damage"
        });
        setCandidates(payload.candidates);
        setDamageProfile(payload.damageProfile ?? []);
        setSelectedIds(new Set(payload.candidates.map((candidate) => candidate.id)));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import FFLogs timeline.");
    } finally {
      setLoading(false);
    }
  }

  function updateCandidate(id: string, patch: Partial<BossTimelineEventCandidate>) {
    setCandidates((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function acceptSelected() {
    const events: TimelineEvent[] = candidates
      .filter((candidate) => selectedIds.has(candidate.id))
      .map((candidate) => ({
        id: `fflogs-${candidate.id}`,
        time: candidate.relativeTime,
        displayTime: formatTime(candidate.relativeTime),
        name: candidate.abilityName,
        abilityGameId: candidate.abilityGameId,
        damageType: candidate.damageType,
        targetType: candidate.targetType,
        severity: candidate.severity ?? "unknown",
        mitigationRelevant: candidate.mitigationRelevant,
        observedDamage: candidate.observedDamage,
        notes: candidate.notes,
        source: `fflogs:${candidate.reportCode}:${candidate.fightId}`
      }));
    onImport(events, selectedFight?.name ?? report?.title ?? "FFLogs Import");
    onClose();
  }

  async function saveDraftTemplate() {
    if (!selectedFightId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ template: EncounterTemplate }>("/api/fflogs/build-template", {
        report: reportInput,
        fightId: selectedFightId,
        fightName: selectedFight?.name,
        encounterName: selectedFight?.encounterName ?? selectedFight?.name,
        candidates,
        selectedIds: [...selectedIds]
      });
      saveEncounterTemplate(payload.template);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save FFLogs template.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4">
      <div className="mx-auto flex max-h-[94vh] max-w-7xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Import timeline from FFLogs</h2>
            <p className="text-xs text-slate-400">Paste a report URL/code, choose a fight, preview candidates, then import selected events.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={acceptSelected} disabled={!selectedIds.size}>
              Import selected ({selectedIds.size})
            </button>
            <button className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-900" onClick={onClose} aria-label="Close FFLogs import">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Report URL or code</label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={reportInput}
                  onChange={(event) => setReportInput(event.target.value)}
                  onPaste={(event) => {
                    const pasted = event.clipboardData.getData("text").trim();
                    if (pasted) {
                      event.preventDefault();
                      void loadReport(pasted);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && reportInput.trim()) {
                      event.preventDefault();
                      void loadReport();
                    }
                  }}
                  placeholder="https://www.fflogs.com/reports/..."
                />
                <button className="mt-2 w-full rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={() => loadReport()} disabled={loading || !reportInput.trim()}>
                  {loading ? "Loading FFLogs report..." : "1. Fetch fights from report"}
                </button>
              </div>
              {report ? (
                <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
                  <div className="font-semibold text-slate-100">{report.title ?? report.code}</div>
                  <div className="text-xs text-slate-400">{report.fights.length} fights found</div>
                </div>
              ) : null}
              {report ? <FFLogsFightPicker fights={report.fights as FFLogsFightSummary[]} selectedFightId={selectedFightId} onSelect={setSelectedFightId} /> : null}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Import mode</label>
                <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" value={mode} onChange={(event) => setMode(event.target.value as ImportMode)}>
                  <option value="timeline">Boss timeline only</option>
                  <option value="timeline_and_damage">Boss timeline + observed damage</option>
                  <option value="damage">Observed damage only</option>
                </select>
                <button className="mt-2 w-full rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={importPreview} disabled={loading || !selectedFightId}>
                  2. Preview import
                </button>
                {!selectedFightId ? <p className="mt-2 text-xs text-slate-500">Fetch fights first, then select a fight/pull.</p> : null}
              </div>
              {candidates.length ? (
                <div className="rounded-md border border-teal-300/40 bg-teal-300/10 p-3">
                  <div className="mb-2 text-sm font-semibold text-teal-100">{selectedIds.size} events ready to import</div>
                  <button className="w-full rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={acceptSelected} disabled={!selectedIds.size}>
                    Apply selected events to timeline
                  </button>
                </div>
              ) : null}
              <FFLogsImportWarnings error={error} />
            </div>
            <div className="space-y-4">
              {candidates.length ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/70 p-3">
                  <div className="text-sm text-slate-200">
                    {selectedIds.size} of {candidates.length} timeline candidates selected
                  </div>
                </div>
              ) : null}
              <FFLogsTimelinePreview candidates={candidates} selectedIds={selectedIds} onToggle={toggle} onUpdate={updateCandidate} />
              <FFLogsDamageProfilePreview damageProfile={damageProfile} />
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-5 py-4">
          <div className="text-xs text-slate-500">{selectedIds.size} selected timeline events</div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" onClick={onClose}>Cancel</button>
            <button className="rounded-md border border-teal-300/50 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-300/10 disabled:opacity-50" onClick={saveDraftTemplate} disabled={!selectedIds.size || !selectedFightId}>
              Save draft template
            </button>
            <button className="rounded-md bg-teal-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={acceptSelected} disabled={!selectedIds.size}>
              Apply selected events to timeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
