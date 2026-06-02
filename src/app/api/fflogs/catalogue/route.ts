import { NextResponse } from "next/server";
import { encounterCatalogueSeed, fightCatalogueGroups, publishedTemplateSeed } from "@/lib/catalogue/fightCatalogueSeed";

export async function GET() {
  return NextResponse.json({ catalogue: encounterCatalogueSeed, groups: fightCatalogueGroups, templates: publishedTemplateSeed });
}
