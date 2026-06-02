"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlannerApp } from "@/components/planner-app";
import { authedFetch, getPlanAuthState } from "@/components/plans/planClient";
import type { LoadedPlanSnapshot } from "@/lib/plans/planTypes";

export function RemotePlanPage({ shareSlug }: { shareSlug: string }) {
  const [loaded, setLoaded] = useState<LoadedPlanSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const auth = await getPlanAuthState();
        const response = auth.token
          ? await authedFetch("/api/plans/load", auth.token, { method: "POST", body: JSON.stringify({ shareSlug }) })
          : await fetch("/api/plans/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shareSlug }) });
        const payload = (await response.json()) as LoadedPlanSnapshot & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Plan not found or access denied.");
        if (!cancelled) setLoaded(payload);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load shared plan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-foreground">Loading shared plan...</div>;
  }

  if (!loaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-md border border-border bg-surface p-5">
          <h1 className="text-lg font-bold">Shared plan unavailable</h1>
          <p className="mt-2 text-sm text-muted">{error || "This plan is private, deleted, or the share link is wrong."}</p>
          <Link className="mt-4 inline-flex rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground" href="/">
            Open local planner
          </Link>
        </div>
      </div>
    );
  }

  return <PlannerApp initialSnapshot={loaded.snapshot} readOnly={!loaded.canEdit} remoteAccessLabel={loaded.access} />;
}
