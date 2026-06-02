"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { LogOut, Save, Send } from "lucide-react";
import { importCommonUsageJson, readCommonUsageStore } from "@/lib/common-usage/commonUsageStorage";
import type { PlanSnapshot } from "@/lib/plans/planTypes";
import { usePlannerStore } from "@/store/planner-store";
import { authedFetch, getPlanAuthState, signInWithEmail, signOut, type AuthState } from "@/components/plans/planClient";

function currentSnapshot(): PlanSnapshot {
  const state = usePlannerStore.getState();
  return {
    version: 1,
    plan: state.plan,
    encounter: state.encounter,
    players: state.players,
    placements: state.placements,
    commonUsage: readCommonUsageStore()
  };
}

export function SavePlanButton({ readOnly = false, onSaved }: { readOnly?: boolean; onSaved?: (snapshot: PlanSnapshot) => void }) {
  const plan = usePlannerStore((state) => state.plan);
  const importPlanJson = usePlannerStore((state) => state.importPlanJson);
  const setSaveStatus = usePlannerStore((state) => state.setSaveStatus);
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPlanAuthState().then(setAuth);
  }, []);

  const canSave = useMemo(() => Boolean(auth.token && !readOnly), [auth.token, readOnly]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOut();
      setAuth({ user: null, token: null });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!auth.token || readOnly) return;
    setBusy(true);
    setSaveStatus("saving");
    setMessage("");
    try {
      const response = await authedFetch("/api/plans/save", auth.token, {
        method: "POST",
        body: JSON.stringify({ snapshot: currentSnapshot() })
      });
      const payload = (await response.json()) as { snapshot?: PlanSnapshot; error?: string };
      if (!response.ok || !payload.snapshot) throw new Error(payload.error ?? "Could not save plan.");
      importPlanJson(payload.snapshot);
      if (payload.snapshot.commonUsage) importCommonUsageJson(payload.snapshot.commonUsage);
      setSaveStatus("saved");
      onSaved?.(payload.snapshot);
      setMessage("Saved to Supabase.");
    } catch (error) {
      setSaveStatus("failed");
      setMessage(error instanceof Error ? error.message : "Could not save plan.");
    } finally {
      setBusy(false);
    }
  }

  if (readOnly) {
    return <span className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted">Viewing shared plan</span>;
  }

  if (!auth.user) {
    return (
      <form className="flex flex-wrap items-center gap-2" onSubmit={handleSignIn}>
        <input
          className="w-44 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@example.com"
          type="email"
          aria-label="Email for Supabase sign-in"
        />
        <button className="inline-flex items-center gap-2 rounded-md border border-accent/60 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-60" disabled={busy || !email}>
          <Send className="h-4 w-4" aria-hidden="true" />
          Sign in to save
        </button>
        {message || auth.error ? <span className="max-w-72 text-xs text-muted">{message || auth.error}</span> : null}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        onClick={handleSave}
        disabled={busy || !canSave}
      >
        <Save className="h-4 w-4" aria-hidden="true" />
        Save plan
      </button>
      <button className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-surface" onClick={handleSignOut} disabled={busy}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
      {message ? <span className="max-w-72 text-xs text-muted">{message}</span> : null}
      <span className="sr-only">Current plan: {plan.title}</span>
    </div>
  );
}
