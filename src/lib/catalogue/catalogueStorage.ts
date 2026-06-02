import { encounterCatalogueSeed, publishedTemplateSeed } from "@/lib/catalogue/fightCatalogueSeed";
import type { EncounterCatalogueItem, EncounterTemplate } from "@/lib/catalogue/catalogueTypes";

export const TEMPLATE_STORAGE_KEY = "mitigation-planner-encounter-templates-v2";
export const TEMPLATE_UPDATED_EVENT = "encounter-templates-updated";

function readLocalTemplates(): EncounterTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? "[]") as EncounterTemplate[];
  } catch {
    return [];
  }
}

function writeLocalTemplates(templates: EncounterTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new CustomEvent(TEMPLATE_UPDATED_EVENT));
}

export function getAllEncounterTemplates() {
  const templates = [...readLocalTemplates(), ...publishedTemplateSeed];
  return templates.filter((template, index) => templates.findIndex((item) => item.id === template.id) === index);
}

export function getPublishedEncounterTemplates() {
  return getAllEncounterTemplates().filter((template) => template.status === "published");
}

export function getTemplatesForEncounter(encounterId: string) {
  return getAllEncounterTemplates().filter((template) => template.encounterCatalogueItemId === encounterId);
}

export function saveEncounterTemplate(template: EncounterTemplate) {
  const local = readLocalTemplates();
  const next = [template, ...local.filter((item) => item.id !== template.id)];
  writeLocalTemplates(next);
}

export function importEncounterTemplates(templates: EncounterTemplate[]) {
  const local = readLocalTemplates();
  const next = [...templates, ...local].filter((template, index, all) => all.findIndex((item) => item.id === template.id) === index);
  writeLocalTemplates(next);
}

export function exportEncounterTemplates() {
  return JSON.stringify(getAllEncounterTemplates(), null, 2);
}

export function getCatalogueWithTemplateFlags(): EncounterCatalogueItem[] {
  const publishedTemplateIds = new Set(getPublishedEncounterTemplates().map((template) => template.encounterCatalogueItemId));
  return encounterCatalogueSeed.map((encounter) => ({
    ...encounter,
    hasPublishedTemplate: encounter.hasPublishedTemplate || publishedTemplateIds.has(encounter.id)
  }));
}
