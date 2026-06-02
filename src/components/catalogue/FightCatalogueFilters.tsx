import type { EncounterCatalogueItem } from "@/lib/catalogue/catalogueTypes";

export type CatalogueFilters = {
  search: string;
  expansion: string;
  contentType: string;
  templateState: string;
};

export function FightCatalogueFilters({
  filters,
  expansions,
  onChange
}: {
  filters: CatalogueFilters;
  expansions: string[];
  onChange: (filters: CatalogueFilters) => void;
}) {
  function patch(next: Partial<CatalogueFilters>) {
    onChange({ ...filters, ...next });
  }

  return (
    <div className="grid gap-3 border-b border-slate-800 bg-slate-950/80 p-4 lg:grid-cols-[1fr_12rem_12rem_12rem]">
      <input
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        value={filters.search}
        onChange={(event) => patch({ search: event.target.value })}
        placeholder="Search fight, short name, tier"
        aria-label="Search fights"
      />
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        value={filters.expansion}
        onChange={(event) => patch({ expansion: event.target.value })}
        aria-label="Filter by expansion"
      >
        <option value="all">All expansions</option>
        {expansions.map((expansion) => (
          <option key={expansion} value={expansion}>
            {expansion}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        value={filters.contentType}
        onChange={(event) => patch({ contentType: event.target.value })}
        aria-label="Filter by content type"
      >
        <option value="all">All content</option>
        {(["ultimate", "savage", "extreme"] satisfies EncounterCatalogueItem["contentType"][]).map((type) => (
          <option key={type} value={type}>
            {type[0].toUpperCase()}
            {type.slice(1)}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        value={filters.templateState}
        onChange={(event) => patch({ templateState: event.target.value })}
        aria-label="Filter by template availability"
      >
        <option value="all">All fights</option>
        <option value="published">Published templates</option>
        <option value="catalogue">Catalogue only</option>
      </select>
    </div>
  );
}
