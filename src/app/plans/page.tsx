import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { PlanList } from "@/components/plans/PlanList";

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Saved Plans</h1>
            <p className="text-sm text-muted">Supabase-backed planner drafts and share links.</p>
          </div>
          <Link className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground" href="/plans/new">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            New plan
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-5">
        <PlanList />
      </main>
    </div>
  );
}
