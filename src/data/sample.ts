import type { Ability, Encounter, MitigationPlacement, Plan, Player } from "@/types/planner";

export const blankPlan: Plan = {
  id: "local-plan",
  title: "Untitled Mitigation Plan",
  encounterName: "Custom Timeline",
  encounterId: "custom",
  ownerId: "local",
  visibility: "private",
  shareSlug: "local-custom-draft",
  createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
};

export const samplePlan: Plan = {
  ...blankPlan,
  title: "FRU Sample Draft",
  encounterName: "Futures Rewritten Ultimate",
  encounterId: "fru-dev",
  shareSlug: "local-fru-sample"
};

export const samplePlayers: Player[] = [
  { id: "mt", planId: "local-plan", name: "Main Tank", job: "PLD", role: "tank", sortOrder: 1 },
  { id: "ot", planId: "local-plan", name: "Off Tank", job: "DRK", role: "tank", sortOrder: 2 },
  { id: "h1", planId: "local-plan", name: "Pure Healer", job: "WHM", role: "healer", sortOrder: 3 },
  { id: "h2", planId: "local-plan", name: "Shield Healer", job: "SGE", role: "healer", sortOrder: 4 },
  { id: "m1", planId: "local-plan", name: "Melee One", job: "MNK", role: "melee", sortOrder: 5 },
  { id: "m2", planId: "local-plan", name: "Melee Two", job: "VPR", role: "melee", sortOrder: 6 },
  { id: "r1", planId: "local-plan", name: "Ranged", job: "BRD", role: "ranged", sortOrder: 7 },
  { id: "r2", planId: "local-plan", name: "Caster", job: "PCT", role: "caster", sortOrder: 8 }
];

export const abilities: Ability[] = [
  {
    id: "reprisal",
    name: "Reprisal",
    job: "Role",
    role: "tank",
    cooldown: 60,
    duration: 15,
    mitigationValue: 0.1,
    damageType: "both",
    targetType: "enemy",
    effectType: "enemy_debuff",
    appliesToRaidwide: true,
    appliesToTankbuster: true,
    iconPath: "/icons/actions/reprisal.png",
    notes: "Enemy damage down. Manual dev metadata."
  },
  {
    id: "rampart",
    name: "Rampart",
    job: "Role",
    role: "tank",
    cooldown: 90,
    duration: 20,
    mitigationValue: 0.2,
    damageType: "both",
    targetType: "self",
    effectType: "self_mitigation",
    appliesToRaidwide: false,
    appliesToTankbuster: true,
    iconPath: "/icons/actions/rampart.png"
  },
  {
    id: "divine-veil",
    name: "Divine Veil",
    job: "PLD",
    role: "tank",
    cooldown: 90,
    duration: 30,
    shieldValue: 0.1,
    damageType: "both",
    targetType: "party",
    effectType: "shield",
    appliesToRaidwide: true,
    appliesToTankbuster: false,
    iconPath: "/icons/actions/divine-veil.png"
  },
  {
    id: "dark-missionary",
    name: "Dark Missionary",
    job: "DRK",
    role: "tank",
    cooldown: 90,
    duration: 15,
    mitigationValue: 0.1,
    damageType: "magical",
    targetType: "party",
    effectType: "party_mitigation",
    appliesToRaidwide: true,
    appliesToTankbuster: false,
    iconPath: "/icons/actions/dark-missionary.png"
  },
  {
    id: "kerachole",
    name: "Kerachole",
    job: "SGE",
    role: "healer",
    cooldown: 30,
    duration: 15,
    mitigationValue: 0.1,
    regenPotency: 100,
    damageType: "both",
    targetType: "party",
    effectType: "party_mitigation",
    appliesToRaidwide: true,
    appliesToTankbuster: false,
    iconPath: "/icons/actions/kerachole.png"
  },
  {
    id: "temperance",
    name: "Temperance",
    job: "WHM",
    role: "healer",
    cooldown: 120,
    duration: 20,
    mitigationValue: 0.1,
    damageType: "both",
    targetType: "party",
    effectType: "party_mitigation",
    appliesToRaidwide: true,
    appliesToTankbuster: false,
    iconPath: "/icons/actions/temperance.png"
  },
  {
    id: "addle",
    name: "Addle",
    job: "Role",
    role: "caster",
    cooldown: 90,
    duration: 15,
    mitigationValue: 0.1,
    damageType: "magical",
    targetType: "enemy",
    effectType: "enemy_debuff",
    appliesToRaidwide: true,
    appliesToTankbuster: true,
    iconPath: "/icons/actions/addle.png",
    notes: "Warns on physical-only events in this local model."
  },
  {
    id: "feint",
    name: "Feint",
    job: "Role",
    role: "melee",
    cooldown: 90,
    duration: 15,
    mitigationValue: 0.1,
    damageType: "physical",
    targetType: "enemy",
    effectType: "enemy_debuff",
    appliesToRaidwide: true,
    appliesToTankbuster: true,
    iconPath: "/icons/actions/feint.png",
    notes: "Warns on magical-only events in this local model."
  },
  {
    id: "troubadour",
    name: "Troubadour",
    job: "BRD",
    role: "ranged",
    cooldown: 120,
    duration: 15,
    mitigationValue: 0.1,
    damageType: "both",
    targetType: "party",
    effectType: "party_mitigation",
    appliesToRaidwide: true,
    appliesToTankbuster: false,
    iconPath: "/icons/actions/troubadour.png"
  }
];

export const blankEncounter: Encounter = {
  id: "custom",
  name: "Custom Timeline",
  shortName: "Custom",
  phases: [{ id: "custom-phase", name: "Custom Fight", startTime: 0, endTime: 480 }],
  events: [],
  sourceLinks: []
};

export const sampleEncounter: Encounter = {
  id: "fru-dev",
  name: "Futures Rewritten Ultimate",
  shortName: "FRU",
  expansion: "Dawntrail",
  patch: "7.11",
  phases: [
    { id: "p1", name: "P1 Fatebreaker", startTime: 0, endTime: 420 },
    { id: "p2", name: "P2 Usurper of Frost", startTime: 420, endTime: 780 }
  ],
  events: [
    {
      id: "cyclonic-break",
      phaseId: "p1",
      time: 15,
      displayTime: "0:15",
      name: "Cyclonic Break",
      damageType: "magical",
      targetType: "party",
      severity: "high",
      mitigationRelevant: true,
      notes: "Hand-built dev sample, not a verified timeline."
    },
    {
      id: "powder-mark-trail",
      phaseId: "p1",
      time: 42,
      displayTime: "0:42",
      name: "Powder Mark Trail",
      damageType: "physical",
      targetType: "tank",
      severity: "high",
      mitigationRelevant: true
    },
    {
      id: "utopian-sky",
      phaseId: "p1",
      time: 79,
      displayTime: "1:19",
      name: "Utopian Sky",
      damageType: "magical",
      targetType: "party",
      severity: "lethal",
      mitigationRelevant: true
    },
    {
      id: "burnished-glory",
      phaseId: "p1",
      time: 122,
      displayTime: "2:02",
      name: "Burnished Glory",
      damageType: "magical",
      targetType: "party",
      severity: "high",
      mitigationRelevant: true
    },
    {
      id: "fall-of-faith",
      phaseId: "p1",
      time: 188,
      displayTime: "3:08",
      name: "Fall of Faith",
      damageType: "unknown",
      targetType: "mechanic",
      severity: "medium",
      mitigationRelevant: false
    },
    {
      id: "burnt-strike-towers",
      phaseId: "p1",
      time: 252,
      displayTime: "4:12",
      name: "Burnt Strike / Towers",
      damageType: "physical",
      targetType: "party",
      severity: "high",
      mitigationRelevant: true
    },
    {
      id: "enrage-burnished-glory",
      phaseId: "p1",
      time: 391,
      displayTime: "6:31",
      name: "Enrage Burnished Glory",
      damageType: "magical",
      targetType: "party",
      severity: "lethal",
      mitigationRelevant: true
    }
  ],
  sourceLinks: [
    {
      label: "Ultimate Uncoiled FRU Resource Hub",
      url: "https://ultimateuncoiled.com/fru/",
      type: "reference"
    },
    {
      label: "Thaliak FRU page",
      url: "https://thaliak.com/ultimates/fru/",
      type: "timeline"
    }
  ]
};

export const samplePlacements: MitigationPlacement[] = [
  {
    id: "place-1",
    planId: "local-plan",
    abilityId: "reprisal",
    playerId: "mt",
    time: 6,
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
  },
  {
    id: "place-2",
    planId: "local-plan",
    abilityId: "kerachole",
    playerId: "h2",
    time: 70,
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
  },
  {
    id: "place-3",
    planId: "local-plan",
    abilityId: "addle",
    playerId: "r2",
    time: 112,
    updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
  }
];
