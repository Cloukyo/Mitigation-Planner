import Link from "next/link";
import { FilePlus2, Import, Library, Save, Wand2 } from "lucide-react";
import { PublishedTemplateBrowser } from "@/components/templates/PublishedTemplateBrowser";

export default function NewPlanPage() {
  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 px-5 py-5">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-bold text-white">Create Plan</h1>
          <p className="text-sm text-slate-400">Start from a known fight, a blank custom timeline, or an FFLogs import.</p>
          <Link className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900" href="/plans">
            <Save className="h-4 w-4" aria-hidden="true" />
            View saved plans
          </Link>
        </div>
      </header>
      <main>
        <section className="mx-auto grid max-w-7xl gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          <Link className="rounded-md border border-teal-300/50 bg-teal-300/10 p-4 hover:bg-teal-300/15" href="/templates">
            <Library className="mb-3 h-5 w-5 text-teal-200" aria-hidden="true" />
            <h2 className="font-bold text-white">Start from published template</h2>
            <p className="mt-1 text-sm text-slate-400">Browse cleaned app-owned timelines by expansion and fight type.</p>
          </Link>
          <Link className="rounded-md border border-slate-800 bg-slate-950 p-4 hover:bg-slate-900" href="/">
            <FilePlus2 className="mb-3 h-5 w-5 text-slate-300" aria-hidden="true" />
            <h2 className="font-bold text-white">Start blank custom plan</h2>
            <p className="mt-1 text-sm text-slate-400">Open the planner with an empty local timeline.</p>
          </Link>
          <Link className="rounded-md border border-slate-800 bg-slate-950 p-4 hover:bg-slate-900" href="/?import=fflogs">
            <Import className="mb-3 h-5 w-5 text-slate-300" aria-hidden="true" />
            <h2 className="font-bold text-white">Import timeline from FFLogs report</h2>
            <p className="mt-1 text-sm text-slate-400">Paste a report URL, pick a fight, preview candidates, then import.</p>
          </Link>
          <Link className="rounded-md border border-slate-800 bg-slate-950 p-4 hover:bg-slate-900" href="/templates?dev=1">
            <Wand2 className="mb-3 h-5 w-5 text-slate-300" aria-hidden="true" />
            <h2 className="font-bold text-white">Build template from curated reports</h2>
            <p className="mt-1 text-sm text-slate-400">Developer flow for saving draft, reviewed, or published templates.</p>
          </Link>
        </section>
        <PublishedTemplateBrowser />
      </main>
    </div>
  );
}
