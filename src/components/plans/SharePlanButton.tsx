"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { PlanVisibilitySettings } from "@/components/plans/PlanVisibilitySettings";
import { authedFetch, getPlanAuthState, type AuthState } from "@/components/plans/planClient";
import type { PlanVisibility } from "@/lib/plans/planTypes";
import { usePlannerStore } from "@/store/planner-store";

function shareUrl(shareSlug: string) {
  if (typeof window === "undefined") return `/plan/${shareSlug}`;
  return `${window.location.origin}/plan/${shareSlug}`;
}

export function SharePlanButton({ readOnly = false }: { readOnly?: boolean }) {
  const plan = usePlannerStore((state) => state.plan);
  const updatePlanVisibility = usePlannerStore((state) => state.updatePlanVisibility);
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });
  const [visibility, setVisibility] = useState<PlanVisibility>(plan.visibility);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPlanAuthState().then(setAuth);
  }, []);

  useEffect(() => {
    setVisibility(plan.visibility);
  }, [plan.visibility]);

  const hasSavedPlan = Boolean(plan.shareSlug && !plan.shareSlug.startsWith("local-"));
  const url = hasSavedPlan ? shareUrl(plan.shareSlug) : "";

  async function updateSharing(nextVisibility = visibility) {
    if (!auth.token || !hasSavedPlan || readOnly) {
      setMessage(hasSavedPlan ? "Sign in as the owner to change sharing." : "Save this plan before sharing.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await authedFetch("/api/plans/share", auth.token, {
        method: "POST",
        body: JSON.stringify({ planId: plan.id, shareSlug: plan.shareSlug, visibility: nextVisibility })
      });
      const payload = (await response.json()) as { shareUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update sharing.");
      updatePlanVisibility(nextVisibility);
      setMessage(nextVisibility === "private" ? "Plan is private." : "Share link is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update sharing.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!url) {
      setMessage("Save this plan before sharing.");
      return;
    }
    await navigator.clipboard.writeText(url);
    setMessage("Copied share link.");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PlanVisibilitySettings
        value={visibility}
        disabled={busy || readOnly || !hasSavedPlan}
        onChange={(next) => {
          setVisibility(next);
          void updateSharing(next);
        }}
      />
      <button
        className="inline-flex items-center gap-2 rounded-md border border-secondary/60 px-3 py-2 text-sm font-semibold text-secondary hover:bg-secondary/10 disabled:opacity-60"
        onClick={() => updateSharing()}
        disabled={busy || readOnly}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Share
      </button>
      <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface disabled:opacity-60" onClick={copyLink} disabled={!hasSavedPlan}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy link
      </button>
      {url ? (
        <a className="inline-flex items-center gap-1 text-xs font-semibold text-secondary" href={`/plan/${plan.shareSlug}`} target="_blank" rel="noreferrer">
          Open
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : null}
      {message ? <span className="max-w-72 text-xs text-muted">{message}</span> : null}
    </div>
  );
}
