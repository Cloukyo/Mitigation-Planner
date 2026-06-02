export function parseReportUrl(value: string): { reportCode: string; fightId?: number } {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Enter an FFLogs report URL or report code.");
  }

  const rawCodeMatch = trimmed.match(/^[A-Za-z0-9]{8,}$/);
  if (rawCodeMatch) {
    return { reportCode: trimmed };
  }

  const url = new URL(trimmed);
  const reportMatch = url.pathname.match(/\/reports\/([A-Za-z0-9]+)/);
  const reportCode = reportMatch?.[1];
  if (!reportCode) {
    throw new Error("Could not find an FFLogs report code in that URL.");
  }

  const queryFight = url.searchParams.get("fight");
  const hashFight = url.hash.match(/fight=(\d+)/)?.[1];
  const fight = queryFight ?? hashFight;

  return {
    reportCode,
    fightId: fight ? Number(fight) : undefined
  };
}
