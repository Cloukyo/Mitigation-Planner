import { Suspense } from "react";
import { EncounterTemplateSeeder } from "@/components/templates/EncounterTemplateSeeder";
import { PublishedTemplateBrowser } from "@/components/templates/PublishedTemplateBrowser";

export default function TemplatesPage() {
  return (
    <>
      <PublishedTemplateBrowser />
      <Suspense fallback={null}>
        <EncounterTemplateSeeder />
      </Suspense>
    </>
  );
}
