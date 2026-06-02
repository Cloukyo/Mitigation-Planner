export function CommonUsageLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full border border-teal-200 bg-teal-300/40" />
        pending reference
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full border border-emerald-200 bg-emerald-300/50" />
        accepted
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full border border-amber-200 bg-amber-300/40" />
        unmatched/low confidence
      </span>
    </div>
  );
}
