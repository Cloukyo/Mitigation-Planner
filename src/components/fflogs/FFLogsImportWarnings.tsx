export function FFLogsImportWarnings({ error }: { error?: string | null }) {
  return (
    <div className="space-y-2 text-xs">
      {error ? <div className="rounded-md border border-red-400/40 bg-red-400/10 p-3 text-red-100">{error}</div> : null}
      <div className="rounded-md border border-amber-400/40 bg-amber-400/10 p-3 text-amber-100">
        Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions.
      </div>
      <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 text-slate-300">
        FFLogs-derived timelines are log-derived candidates. Review names, timestamps, severity, and relevance before importing.
      </div>
    </div>
  );
}
