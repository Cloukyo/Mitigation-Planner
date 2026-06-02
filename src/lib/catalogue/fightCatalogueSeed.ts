import { sampleEncounter } from "@/data/sample";
import { formatTime } from "@/lib/time";
import type { EncounterTemplate, FightCatalogueGroup, EncounterCatalogueItem } from "@/lib/catalogue/catalogueTypes";
import type { TimelineEvent } from "@/types/planner";

const seedDate = "2026-06-01T00:00:00.000Z";

export const fightCatalogueGroups: FightCatalogueGroup[] = [
  { id: "exp-dawntrail", name: "Dawntrail", type: "expansion", sortOrder: 10 },
  { id: "exp-endwalker", name: "Endwalker", type: "expansion", sortOrder: 20 },
  { id: "exp-shadowbringers", name: "Shadowbringers", type: "expansion", sortOrder: 30 },
  { id: "exp-stormblood", name: "Stormblood", type: "expansion", sortOrder: 40 },
  { id: "type-ultimate", name: "Ultimate", type: "content_type", sortOrder: 10 },
  { id: "type-savage", name: "Savage", type: "content_type", sortOrder: 20 },
  { id: "type-extreme", name: "Extreme", type: "content_type", sortOrder: 30 },
  { id: "dt-arcadion", name: "AAC / Arcadion", type: "tier", parentId: "exp-dawntrail", sortOrder: 10 },
  { id: "dt-ultimates", name: "Dawntrail Ultimates", type: "tier", parentId: "exp-dawntrail", sortOrder: 5 },
  { id: "dt-extreme", name: "Dawntrail Extremes", type: "tier", parentId: "exp-dawntrail", sortOrder: 20 },
  { id: "ew-ultimates", name: "Endwalker Ultimates", type: "tier", parentId: "exp-endwalker", sortOrder: 10 },
  { id: "shb-ultimates", name: "Shadowbringers Ultimates", type: "tier", parentId: "exp-shadowbringers", sortOrder: 10 }
];

export const encounterCatalogueSeed: EncounterCatalogueItem[] = [
  {
    id: "dmu",
    name: "Dancing Mad Ultimate",
    shortName: "DMU",
    expansion: "Dawntrail",
    patch: "7.51",
    contentType: "ultimate",
    zoneName: "Dancing Mad Ultimate",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    fflogsZoneId: 76,
    fflogsEncounterId: 1085,
    isCurrent: true,
    isPublished: true,
    hasPublishedTemplate: true,
    sortOrder: 1,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "fru",
    name: "Futures Rewritten Ultimate",
    shortName: "FRU",
    expansion: "Dawntrail",
    patch: "7.11",
    contentType: "ultimate",
    zoneName: "Futures Rewritten",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    fflogsZoneId: 65,
    fflogsEncounterId: 1079,
    isCurrent: true,
    isPublished: true,
    hasPublishedTemplate: true,
    sortOrder: 10,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "top",
    name: "The Omega Protocol Ultimate",
    shortName: "TOP",
    expansion: "Endwalker",
    patch: "6.31",
    contentType: "ultimate",
    zoneName: "The Omega Protocol",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    fflogsZoneId: 53,
    fflogsEncounterId: 1068,
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: true,
    sortOrder: 20,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "dsr",
    name: "Dragonsong's Reprise Ultimate",
    shortName: "DSR",
    expansion: "Endwalker",
    patch: "6.11",
    contentType: "ultimate",
    zoneName: "Dragonsong's Reprise",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 30,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "tea",
    name: "The Epic of Alexander",
    shortName: "TEA",
    expansion: "Shadowbringers",
    patch: "5.11",
    contentType: "ultimate",
    zoneName: "The Epic of Alexander",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 40,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "uwu",
    name: "The Weapon's Refrain",
    shortName: "UWU",
    expansion: "Stormblood",
    patch: "4.31",
    contentType: "ultimate",
    zoneName: "The Weapon's Refrain",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 50,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "ucob",
    name: "The Unending Coil of Bahamut",
    shortName: "UCOB",
    expansion: "Stormblood",
    patch: "4.11",
    contentType: "ultimate",
    zoneName: "The Unending Coil of Bahamut",
    tierName: "Ultimate",
    difficulty: "Ultimate",
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 60,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "aac-lhw-m1s",
    name: "AAC Light-heavyweight M1 (Savage)",
    shortName: "M1S",
    expansion: "Dawntrail",
    patch: "7.05",
    contentType: "savage",
    zoneName: "Arcadion",
    tierName: "AAC Light-heavyweight",
    difficulty: "Savage",
    fflogsZoneId: 73,
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 110,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "aac-lhw-m2s",
    name: "AAC Light-heavyweight M2 (Savage)",
    shortName: "M2S",
    expansion: "Dawntrail",
    patch: "7.05",
    contentType: "savage",
    zoneName: "Arcadion",
    tierName: "AAC Light-heavyweight",
    difficulty: "Savage",
    fflogsZoneId: 73,
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 120,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "aac-lhw-m3s",
    name: "AAC Light-heavyweight M3 (Savage)",
    shortName: "M3S",
    expansion: "Dawntrail",
    patch: "7.05",
    contentType: "savage",
    zoneName: "Arcadion",
    tierName: "AAC Light-heavyweight",
    difficulty: "Savage",
    fflogsZoneId: 73,
    fflogsEncounterId: 103,
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 130,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "aac-lhw-m4s",
    name: "AAC Light-heavyweight M4 (Savage)",
    shortName: "M4S",
    expansion: "Dawntrail",
    patch: "7.05",
    contentType: "savage",
    zoneName: "Arcadion",
    tierName: "AAC Light-heavyweight",
    difficulty: "Savage",
    fflogsZoneId: 73,
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 140,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "worqor-lar-dor-ex",
    name: "Worqor Lar Dor (Extreme)",
    shortName: "EX1",
    expansion: "Dawntrail",
    patch: "7.0",
    contentType: "extreme",
    zoneName: "Worqor Lar Dor",
    tierName: "Dawntrail Extremes",
    difficulty: "Extreme",
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 210,
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "everkeep-ex",
    name: "Everkeep (Extreme)",
    shortName: "EX2",
    expansion: "Dawntrail",
    patch: "7.0",
    contentType: "extreme",
    zoneName: "Everkeep",
    tierName: "Dawntrail Extremes",
    difficulty: "Extreme",
    isCurrent: false,
    isPublished: true,
    hasPublishedTemplate: false,
    sortOrder: 220,
    createdAt: seedDate,
    updatedAt: seedDate
  }
];

export const publishedTemplateSeed: EncounterTemplate[] = [
  {
    id: "template-dmu-day-one",
    encounterCatalogueItemId: "dmu",
    name: "Dancing Mad Ultimate Day-One Prog Template",
    shortName: "DMU",
    source: "fflogs_curated_reports",
    status: "published",
    events: [
      {
        ...event("dmu-p1-revolting-ruin-1", 11, "Revolting Ruin III", "unknown", "party", "high", "Provisional P1 scout timing from early public FFLogs prog pulls. Review damage/targeting in raid."),
        eventTag: "raidwide",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-graven-image-1", 27, "Graven Image", "unknown", "mechanic", "unknown", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        mitigationRelevant: false,
        source: "fflogs"
      },
      {
        ...event("dmu-p1-mystery-magic-1", 33, "Mystery Magic", "unknown", "mechanic", "unknown", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        mitigationRelevant: false,
        source: "fflogs"
      },
      {
        ...event("dmu-p1-blizzard-blowout-1", 33, "Blizzard III Blowout", "unknown", "spread", "medium", "Provisional P1 scout timing from early public FFLogs prog pulls. Targeting needs review."),
        eventTag: "spread",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-double-trouble-trap", 42, "Double-Trouble Trap", "unknown", "mechanic", "medium", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-explosion", 44, "Explosion", "unknown", "party", "high", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "raidwide",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-thrumming-thunder-1", 49, "Thrumming Thunder III", "unknown", "mechanic", "medium", "Provisional P1 scout timing from early public FFLogs prog pulls. Targeting needs review."),
        eventTag: "unknown",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-light-of-judgment-1", 58, "Light of Judgment", "magical", "party", "high", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "raidwide",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-hyperdrive-1", 67, "Hyperdrive", "unknown", "tank", "high", "Observed as a cast in early public FFLogs prog pulls. Targeting needs review."),
        eventTag: "tankbuster",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-graven-image-2", 78, "Graven Image", "unknown", "mechanic", "unknown", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        mitigationRelevant: false,
        source: "fflogs"
      },
      {
        ...event("dmu-p1-blizzard-blowout-2", 83, "Blizzard III Blowout", "unknown", "spread", "medium", "Provisional P1 scout timing from early public FFLogs prog pulls. Targeting needs review."),
        eventTag: "spread",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-revolting-ruin-2", 93, "Revolting Ruin III", "unknown", "party", "high", "Provisional P1 scout timing from early public FFLogs prog pulls. Review damage/targeting in raid."),
        eventTag: "raidwide",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-light-of-judgment-2", 128, "Light of Judgment", "magical", "party", "high", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "raidwide",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-hyperdrive-2", 136, "Hyperdrive", "unknown", "tank", "high", "Observed as a cast in early public FFLogs prog pulls. Targeting needs review."),
        eventTag: "tankbuster",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-tele-trouncing", 147, "Tele-Trouncing", "unknown", "mechanic", "high", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-graven-image-3", 162, "Graven Image", "unknown", "mechanic", "unknown", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        mitigationRelevant: false,
        source: "fflogs"
      },
      {
        ...event("dmu-p1-mystery-magic-2", 182, "Mystery Magic", "unknown", "mechanic", "unknown", "Provisional P1 scout timing from early public FFLogs prog pulls."),
        eventTag: "unknown",
        mitigationRelevant: false,
        source: "fflogs"
      },
      {
        ...event("dmu-p1-thrumming-thunder-2", 182, "Thrumming Thunder III", "unknown", "mechanic", "medium", "Provisional P1 scout timing from early public FFLogs prog pulls. Targeting needs review."),
        eventTag: "unknown",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-ultimate-embrace", 216, "Ultimate Embrace", "unknown", "tank", "high", "Lower-confidence scout timing: only observed in pulls that survived past 3:30."),
        eventTag: "tankbuster",
        source: "fflogs"
      },
      {
        ...event("dmu-p1-forsaken", 229, "Forsaken", "unknown", "mechanic", "high", "Lower-confidence scout timing: only observed in pulls that survived past 3:45."),
        eventTag: "unknown",
        source: "fflogs"
      }
    ],
    sourceLinks: [
      {
        label: "Early public FFLogs scout report",
        url: "https://www.fflogs.com/reports/4nkRWbJGj38tywrM",
        type: "fflogs"
      }
    ],
    sourceReports: [
      {
        reportCode: "4nkRWbJGj38tywrM",
        fightId: 1,
        fightName: "Kefka",
        encounterId: 1085,
        encounterName: "Dancing Mad",
        kill: false,
        duration: 253,
        sourceUrl: "https://www.fflogs.com/reports/4nkRWbJGj38tywrM#fight=1"
      },
      {
        reportCode: "4nkRWbJGj38tywrM",
        fightId: 5,
        fightName: "Kefka",
        encounterId: 1085,
        encounterName: "Dancing Mad",
        kill: false,
        duration: 198,
        sourceUrl: "https://www.fflogs.com/reports/4nkRWbJGj38tywrM#fight=5"
      },
      {
        reportCode: "4nkRWbJGj38tywrM",
        fightId: 6,
        fightName: "Kefka",
        encounterId: 1085,
        encounterName: "Dancing Mad",
        kill: false,
        duration: 198,
        sourceUrl: "https://www.fflogs.com/reports/4nkRWbJGj38tywrM#fight=6"
      },
      {
        reportCode: "4nkRWbJGj38tywrM",
        fightId: 11,
        fightName: "Kefka",
        encounterId: 1085,
        encounterName: "Dancing Mad",
        kill: false,
        duration: 224,
        sourceUrl: "https://www.fflogs.com/reports/4nkRWbJGj38tywrM#fight=11"
      },
      {
        reportCode: "4nkRWbJGj38tywrM",
        fightId: 12,
        fightName: "Kefka",
        encounterId: 1085,
        encounterName: "Dancing Mad",
        kill: false,
        duration: 206,
        sourceUrl: "https://www.fflogs.com/reports/4nkRWbJGj38tywrM#fight=12"
      }
    ],
    notes: "Day-one prog template seeded from early public FFLogs Dancing Mad pulls. Treat these P1 timings as provisional scout data; confirm target shapes, damage types, and mitigation relevance with your static's logs as progression continues.",
    createdAt: seedDate,
    updatedAt: seedDate
  },
  {
    id: "template-fru-seed",
    encounterCatalogueItemId: "fru",
    name: "Futures Rewritten Ultimate Starter Timeline",
    shortName: "FRU",
    source: "manual",
    status: "published",
    events: sampleEncounter.events,
    sourceLinks: [
      {
        label: "Ultimate Uncoiled FRU Resource Hub",
        url: "https://ultimateuncoiled.com/fru/",
        type: "community_guide"
      },
      {
        label: "Thaliak FRU page",
        url: "https://thaliak.com/ultimates/fru/",
        type: "community_guide"
      }
    ],
    notes: "Seed starter template from the local development sample. Treat timings as a planning draft until reviewed against logs.",
    createdAt: seedDate,
    updatedAt: seedDate
  }
];

function event(id: string, time: number, name: string, damageType: TimelineEvent["damageType"], targetType: TimelineEvent["targetType"], severity: TimelineEvent["severity"], notes?: string): TimelineEvent {
  return {
    id,
    time,
    displayTime: formatTime(time),
    name,
    damageType,
    targetType,
    severity,
    mitigationRelevant: severity === "high" || severity === "lethal",
    source: "manual",
    notes
  };
}

publishedTemplateSeed.push({
  id: "template-top-starter",
  encounterCatalogueItemId: "top",
  name: "The Omega Protocol Ultimate Starter Timeline",
  shortName: "TOP",
  source: "community",
  status: "published",
  events: [
    event("top-program-loop", 15, "Program Loop", "magical", "party", "high"),
    event("top-pantokrator", 72, "Pantokrator", "magical", "party", "high"),
    event("top-p1-enrage", 118, "P1 Wave Cannon / Enrage", "magical", "party", "lethal"),
    event("top-party-synergy", 154, "Party Synergy", "magical", "party", "high"),
    event("top-limitless-synergy", 220, "Limitless Synergy", "magical", "party", "high"),
    event("top-p2-enrage", 279, "P2 Optimized Ultima", "magical", "party", "lethal"),
    event("top-hello-world", 327, "Hello World", "magical", "party", "high"),
    event("top-critical-error", 407, "Critical Error", "magical", "party", "lethal"),
    event("top-blue-screen", 485, "Blue Screen", "magical", "party", "lethal"),
    event("top-delta", 550, "Run: Dynamis Delta", "magical", "party", "high"),
    event("top-sigma", 655, "Run: Dynamis Sigma", "magical", "party", "high"),
    event("top-omega", 780, "Run: Dynamis Omega", "magical", "party", "high"),
    event("top-p5-enrage", 900, "Blind Faith", "magical", "party", "lethal"),
    event("top-cosmo-arrow", 950, "Cosmo Arrow", "magical", "party", "high"),
    event("top-unlimited-wave-cannon", 1015, "Unlimited Wave Cannon", "magical", "party", "high"),
    event("top-cosmo-dive", 1090, "Cosmo Dive", "physical", "tank", "high"),
    event("top-magic-number", 1210, "Magic Number", "magical", "party", "lethal")
  ],
  sourceLinks: [
    {
      label: "Ultimate Uncoiled TOP Resource Hub",
      url: "https://ultimateuncoiled.com/top/",
      type: "community_guide"
    },
    {
      label: "Icy Veins TOP Guide",
      url: "https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-guides",
      type: "community_guide"
    },
    {
      label: "Thaliak TOP page",
      url: "https://thaliak.com/ultimates/top/",
      type: "community_guide"
    }
  ],
  notes: "Starter reference timeline for planning flow. Review exact timings against your chosen strategy or FFLogs-derived template before relying on it.",
  createdAt: seedDate,
  updatedAt: seedDate
});
