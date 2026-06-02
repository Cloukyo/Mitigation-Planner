"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyPlus, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { authedFetch, getPlanAuthState, signInWithEmail, type AuthState } from "@/components/plans/planClient";
import type { SavedPlanSummary } from "@/lib/plans/planTypes";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PlanList() {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });
  const [plans, setPlans] = useState<SavedPlanSummary[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadPlans(token?: string | null) {
    if (!token) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await authedFetch("/api/plans", token);
      const payload = (await response.json()) as { plans?: SavedPlanSummary[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load saved plans.");
      setPlans(payload.plans ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load saved plans.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    getPlanAuthState().then((nextAuth) => {
      setAuth(nextAuth);
      void loadPlans(nextAuth.token);
    });
  }, []);

  async function signIn() {
    setBusy(true);
    setMessage("");
    try {
      await signInWithEmail(email);
      setMessage("Check your email for the Supabase sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(shareSlug: string) {
    if (!auth.token) return;
    setBusy(true);
    try {
      const response = await authedFetch("/api/plans/duplicate", auth.token, { method: "POST", body: JSON.stringify({ shareSlug }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not duplicate plan.");
      await loadPlans(auth.token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not duplicate plan.");
    } finally {
      setBusy(false);
    }
  }

  async function deletePlan(planId: string) {
    if (!auth.token) return;
    setBusy(true);
    try {
      const response = await authedFetch("/api/plans/delete", auth.token, { method: "POST", body: JSON.stringify({ planId }) });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete plan.");
      setPlans((items) => items.filter((item) => item.id !== planId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete plan.");
    } finally {
      setBusy(false);
    }
  }

  if (!auth.user) {
    return (
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="text-lg font-bold text-foreground">Sign in to view saved plans</h2>
        <p className="mt-1 text-sm text-muted">Saved plans and share links live in Supabase. Local drafts still work without signing in.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input className="w-72 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground" value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="email@example.com" />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60" onClick={signIn} disabled={busy || !email}>
            Send magic link
          </button>
        </div>
        {message || auth.error ? <p className="mt-3 text-sm text-muted">{message || auth.error}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Saved plans</h2>
          <p className="text-sm text-muted">Open, duplicate, or remove plans saved to Supabase.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-elevated" onClick={() => loadPlans(auth.token)} disabled={busy}>
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </div>
      {message ? <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">{message}</p> : null}
      <div className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border">
        {plans.length ? (
          plans.map((plan) => (
            <article key={plan.id} className="grid gap-3 bg-elevated p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-foreground">{plan.title}</h3>
                <p className="mt-1 text-sm text-muted">
                  {plan.encounterName ?? "Custom encounter"} - {plan.visibility} - updated {formatDate(plan.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground" href={`/plan/${plan.shareSlug}`}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open
                </Link>
                <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface" onClick={() => duplicate(plan.shareSlug)} disabled={busy}>
                  <CopyPlus className="h-4 w-4" aria-hidden="true" />
                  Duplicate
                </button>
                <button className="inline-flex items-center gap-2 rounded-md border border-danger/50 px-3 py-2 text-sm text-danger hover:bg-danger/10" onClick={() => deletePlan(plan.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="bg-elevated p-5 text-sm text-muted">No saved plans yet. Open the planner, sign in, and save a draft to create your first share link.</p>
        )}
      </div>
    </section>
  );
}
