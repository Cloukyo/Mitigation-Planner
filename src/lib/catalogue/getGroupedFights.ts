import { fightCatalogueGroups } from "@/lib/catalogue/fightCatalogueSeed";
import type { EncounterCatalogueItem, GroupedFightSection } from "@/lib/catalogue/catalogueTypes";

const contentTypeOrder: EncounterCatalogueItem["contentType"][] = ["ultimate", "savage", "extreme", "criterion", "alliance", "normal", "unknown"];

export function getGroupedFights(encounters: EncounterCatalogueItem[]): GroupedFightSection[] {
  const expansionGroups = fightCatalogueGroups
    .filter((group) => group.type === "expansion")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const knownExpansionNames = new Set(expansionGroups.map((group) => group.name));
  const extraExpansionGroups = [...new Set(encounters.map((encounter) => encounter.expansion).filter((expansion) => !knownExpansionNames.has(expansion)))]
    .sort()
    .map((expansion, index) => ({
      id: `exp-${expansion.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
      name: expansion,
      type: "expansion" as const,
      sortOrder: 100 + index
    }));

  return [...expansionGroups, ...extraExpansionGroups]
    .map((group) => {
      const expansionEncounters = encounters.filter((encounter) => encounter.expansion === group.name).sort((a, b) => a.sortOrder - b.sortOrder);
      const contentTypes = contentTypeOrder
        .map((contentType) => ({
          contentType,
          encounters: expansionEncounters.filter((encounter) => encounter.contentType === contentType)
        }))
        .filter((section) => section.encounters.length > 0);
      return { group, contentTypes };
    })
    .filter((section) => section.contentTypes.length > 0);
}
