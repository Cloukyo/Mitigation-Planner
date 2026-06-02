"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Save, Wand2 } from "lucide-react";
import { encounterCatalogueSeed } from "@/lib/catalogue/fightCatalogueSeed";
import { saveEncounterTemplate } from "@/lib/catalogue/catalogueStorage";
import { aggregateEncounterTimeline } from "@/lib/fflogs/aggregateEncounterTimeline";
import { formatTime } from "@/lib/time";
import type { EncounterTemplate } from "@/lib/catalogue/catalogueTypes";
import type { BossTimelineEventCandidate, DamageProfileEvent, FFLogsReport, SourceReportSummary } from "@/lib/fflogs/types";
import type { TimelineEvent } from "@/types/planner";

type ReportSelection = {
  reportInput: string;
  report: FFLogsReport;
  selectedFightId: number;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload as T;
}

function toTimelineEvents(candidates: BossTimelineEventCandidate[]): TimelineEvent[] {
  return candidates.map((candidate) => ({
    id: `template-${candidate.id}`,
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
}

export function EncounterTemplateSeeder() {
  const searchParams = useSearchParams();
  const defaultEncounterId = searchParams.get("build") ?? encounterCatalogueSeed[0]?.id ?? "";
  const [encounterId, setEncounterId] = useState(defaultEncounterId);
  const [reportText, setReportText] = useState("");
  const [reports, setReports] = useState<ReportSelection[]>([]);
  const [candidates, setCandidates] = useState<BossTimelineEventCandidate[]>([]);
  const [damageProfile, setDamageProfile] = useState<DamageProfileEvent[]>([]);
  const [status, setStatus] = useState<EncounterTemplate["status"]>("draft");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const encounter = useMemo(() => encounterCatalogueSeed.find((item) => item.id === encounterId) ?? encounterCatalogueSeed[0], [encounterId]);

  async function loadReports() {
    const inputs = reportText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    setLoading(true);
    setMessage(null);
    try {
      const loaded = await Promise.all(
        inputs.map(async (input) => {
          const payload = await postJson<{ report: FFLogsReport; selectedFightId?: number }>("/api/fflogs/report", { report: input });
          return {
            reportInput: input,
            report: payload.report,
            selectedFightId: payload.selectedFightId ?? payload.report.fights[0]?.id
          };
        })
      );
      setReports(loaded.filter((item) => item.selectedFightId));
      setCandidates([]);
      setDamageProfile([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not fetch reports.");
    } finally {
      setLoading(false);
    }
  }

  async function buildDraft() {
    setLoading(true);
    setMessage(null);
    try {
      const payloads = await Promise.all(
        reports.map((selection) =>
          postJson<{ candidates: BossTimelineEventCandidate[]; damageProfile: DamageProfileEvent[] }>("/api/fflogs/import-timeline", {
            report: selection.reportInput,
            fightId: selection.selectedFightId,
            includeDamage: true
          })
        )
      );
      const groupedCandidates = payloads.map((payload) => payload.candidates);
      setCandidates(groupedCandidates.length > 1 ? aggregateEncounterTimeline(groupedCandidates) : groupedCandidates[0] ?? []);
      setDamageProfile(payloads.flatMap((payload) => payload.damageProfile ?? []));
      setMessage("Draft timeline built. Review the events, then save the template.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not build template.");
    } finally {
      setLoading(false);
    }
  }

  function updateCandidate(id: string, patch: Partial<BossTimelineEventCandidate>) {
    setCandidates((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function saveTemplate() {
    if (!encounter) return;
    const now = new Date().toISOString();
    const sourceReports: SourceReportSummary[] = reports.map((selection) => {
      const fight = selection.report.fights.find((item) => item.id === selection.selectedFightId);
      return {
        reportCode: selection.report.code,
        fightId: selection.selectedFightId,
        fightName: fight?.name,
        encounterId: fight?.encounterId,
        encounterName: fight?.encounterName,
        kill: fight?.kill ?? false,
        duration: fight?.duration ?? 0,
        sourceUrl: `https://www.fflogs.com/reports/${selection.report.code}#fight=${selection.selectedFightId}`
      };
    });
    const template: EncounterTemplate = {
      id: `template-${encounter.id}-${Date.now()}`,
      encounterCatalogueItemId: encounter.id,
      name: `${encounter.name} Curated Timeline`,
      shortName: encounter.shortName,
      source: "fflogs_curated_reports",
      status,
      events: toTimelineEvents(candidates),
      damageProfile,
      sourceReports,
      sourceLinks: sourceReports.map((report) => ({ label: `${report.reportCode} fight ${report.fightId}`, url: report.sourceUrl ?? "", type: "fflogs" as const })).filter((link) => link.url),
      notes: "Timeline and observed damage are log-derived and may need review.",
      createdAt: now,
      updatedAt: now
    };
    saveEncounterTemplate(template);
    setMessage(`Saved ${status} template with ${template.events.length} events.`);
  }

  return (
    <section className="border-t border-slate-800 bg-slate-950/80 p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-teal-300" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-white">Developer Template Seeder</h2>
            <p className="text-sm text-slate-400">Build app-owned templates from curated public FFLogs reports. Nothing here crawls or discovers logs automatically.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase text-slate-500">Encounter</label>
            <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" value={encounterId} onChange={(event) => setEncounterId(event.target.value)}>
              {encounterCatalogueSeed.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.shortName ? `${item.shortName} - ` : ""}
                  {item.name}
                </option>
              ))}
            </select>
            <label className="block text-xs font-semibold uppercase text-slate-500">Curated FFLogs reports</label>
            <textarea
              className="h-28 w-full resize-none rounded-md border border-slate-700 bg-slate-950 p-3 text-sm text-slate-200"
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              placeholder="One FFLogs report URL per line"
            />
            <button className="w-full rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={loadReports} disabled={loading || !reportText.trim()}>
              1. Fetch report fights
            </button>
            <button className="w-full rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={buildDraft} disabled={loading || !reports.length}>
              2. Build draft from selected fights
            </button>
            <select className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200" value={status} onChange={(event) => setStatus(event.target.value as EncounterTemplate["status"])}>
              <option value="draft">Save as draft</option>
              <option value="reviewed">Save as reviewed</option>
              <option value="published">Save as published</option>
            </select>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-teal-300/60 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-300/10 disabled:opacity-50" onClick={saveTemplate} disabled={!candidates.length}>
              <Save className="h-4 w-4" aria-hidden="true" />
              3. Save template
            </button>
            {message ? <p className="rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">{message}</p> : null}
          </div>
          <div className="min-w-0 space-y-3">
            <div className="rounded-md border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
              {reports.length ? `${reports.length} report${reports.length === 1 ? "" : "s"} loaded` : "No curated reports loaded yet."}
            </div>
            {reports.map((selection, index) => (
              <label key={`${selection.report.code}-${index}`} className="grid gap-2 rounded-md border border-slate-800 bg-slate-950 p-3 text-sm md:grid-cols-[1fr_16rem]">
                <span>
                  <span className="block font-semibold text-slate-100">{selection.report.title ?? selection.report.code}</span>
                  <span className="text-xs text-slate-500">{selection.report.fights.length} fights found</span>
                </span>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={selection.selectedFightId}
                  onChange={(event) =>
                    setReports((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, selectedFightId: Number(event.target.value) } : item)))
                  }
                >
                  {selection.report.fights.map((fight) => (
                    <option key={fight.id} value={fight.id}>
                      #{fight.id} {fight.encounterName ?? fight.name ?? "Fight"}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="max-h-96 overflow-auto rounded-md border border-slate-800">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Ability / mechanic</th>
                    <th className="px-3 py-2">Damage</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 text-slate-300">{candidate.displayTime}</td>
                      <td className="px-3 py-2">
                        <input className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100" value={candidate.abilityName} onChange={(event) => updateCandidate(candidate.id, { abilityName: event.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-slate-300">{candidate.damageType}</td>
                      <td className="px-3 py-2 text-slate-300">{candidate.targetType}</td>
                      <td className="px-3 py-2 text-slate-300">{candidate.severity ?? "unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
