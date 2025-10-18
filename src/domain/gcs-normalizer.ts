import { parseDamageString } from "../utils/dice";
import type { AttackDTO, CharacterDTO } from "./types";

type GCSAttribute = {
  attr_id: string;
  adj?: number;
  calc?: { value?: number };
};

type GCSDefense = {
  value?: number;
  active_defense?: string;
};

type GCSWeapon = {
  name: string;
  usage?: string;
  damage?: string;
  mode?: string;
  acc?: number;
  rof?: number;
  rcl?: number;
  skill_used?: string;
  level?: number;
  notes?: string;
};

type GCSAttackBlock = {
  name: string;
  damage?: string;
  type?: string;
  skill_used?: string;
  level?: number;
  notes?: string;
};

type GCSRecord = {
  id?: string;
  profile?: { name?: string };
  attributes?: GCSAttribute[];
  calc?: {
    move?: number[];
    dodge?: number[];
    parry?: GCSDefense[];
    block?: GCSDefense[];
  };
  skills?: { name: string; calc?: { level?: number } }[];
  advantages?: { name: string; levels?: number }[];
  perks?: { name: string; levels?: number }[];
  powers?: { name: string; levels?: number }[];
  spells?: { name: string; levels?: number }[];
  equipment?: GCSWeapon[];
  attacks?: GCSAttackBlock[];
  notes?: string;
};

function extractAttribute(record: GCSRecord, attrId: string, fallback: number, assumptions: string[]): number {
  const attr = record.attributes?.find((item) => item.attr_id === attrId);
  if (!attr) {
    assumptions.push(`Attribute ${attrId} missing; assumed ${fallback}`);
    return fallback;
  }
  return attr.calc?.value ?? fallback;
}

function extractDerivedAttribute(
  record: GCSRecord,
  attrId: string,
  fallback: number,
  assumptions: string[]
): number {
  const attr = record.attributes?.find((item) => item.attr_id === attrId);
  if (!attr) {
    assumptions.push(`Derived attribute ${attrId} missing; assumed ${fallback}`);
    return fallback;
  }
  return attr.calc?.value ?? fallback;
}

function extractDefense(defenses: GCSDefense[] | undefined, assumptions: string[], name: string): number | undefined {
  if (!defenses || defenses.length === 0) {
    assumptions.push(`${name} not provided in GCS file`);
    return undefined;
  }
  const best = Math.max(...defenses.map((entry) => entry.value ?? 0));
  return best > 0 ? best : undefined;
}

function normalizeAttack(record: GCSRecord, weapon: GCSWeapon | GCSAttackBlock, assumptions: string[]): AttackDTO {
  const parsed = parseDamageString(weapon.damage ?? weapon.notes ?? "");
  let effectiveSkill = "level" in weapon ? weapon.level : undefined;
  if (effectiveSkill == null && weapon.skill_used) {
    const skill = record.skills?.find((s) => s.name === weapon.skill_used);
    if (skill?.calc?.level) {
      effectiveSkill = skill.calc.level;
    }
  }
  if (effectiveSkill == null) {
    assumptions.push(`Attack ${weapon.name} missing skill; assume 10`);
  }
  return {
    name: weapon.name,
    mode: inferMode(weapon.mode ?? weapon.usage),
    skillName: weapon.skill_used,
    effectiveSkill: effectiveSkill ?? undefined,
    acc: "acc" in weapon ? weapon.acc : undefined,
    rof: "rof" in weapon ? weapon.rof : undefined,
    rcl: "rcl" in weapon ? weapon.rcl : undefined,
    damage: parsed.damage,
    armorDivisor: parsed.armorDivisor,
    explosive: parsed.explosive,
    vampiric: parsed.vampiric,
    cycles: parsed.cycles,
    costFP: parsed.costFP,
    notes: "notes" in weapon ? weapon.notes : undefined
  };
}

function inferMode(mode?: string): AttackDTO["mode"] {
  if (!mode) {
    return "melee";
  }
  const text = mode.toLowerCase();
  if (text.includes("innate")) return "innate";
  if (text.includes("missile") || text.includes("ranged") || text.includes("shot")) return "ranged";
  return "melee";
}

function buildTraits(record: GCSRecord): Record<string, number | boolean> {
  const container = [record.advantages, record.perks, record.powers, record.spells]
    .filter((group): group is { name: string; levels?: number }[] => Array.isArray(group))
    .flat();
  const traits: Record<string, number | boolean> = {};
  container.forEach((item) => {
    const key = item.name;
    if (!key) return;
    traits[key] = item.levels ?? true;
    traits[key.replace(/\s+/g, "")] = item.levels ?? true;
  });
  return traits;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function extractDR(record: GCSRecord, assumptions: string[]): CharacterDTO["dr"] {
  const drNotes: Record<string, number[]> = { head: [], torso: [], arms: [], legs: [] };
  const equipment = record.equipment ?? [];
  equipment.forEach((item) => {
    if (!item.notes) return;
    const match = item.notes.match(/DR\s*[:=]?\s*(\d+(?:\/\d+)?)/i);
    if (!match) return;
    const [head, torso, arms, legs] = spreadDR(match[1]);
    if (head) drNotes.head.push(head);
    if (torso) drNotes.torso.push(torso);
    if (arms) drNotes.arms.push(arms);
    if (legs) drNotes.legs.push(legs);
  });

  const dr: CharacterDTO["dr"] = {
    head: average(drNotes.head) || 0,
    torso: average(drNotes.torso) || 0,
    arms: average(drNotes.arms) || 0,
    legs: average(drNotes.legs) || 0
  };

  if (!dr.head && !dr.torso && !dr.arms && !dr.legs) {
    assumptions.push("No DR information found; assumed 0");
  }

  return dr;
}

function spreadDR(notation: string): [number, number, number, number] {
  if (notation.includes("/")) {
    const [major, minor] = notation.split("/").map((value) => Number(value));
    const avg = (major + minor) / 2;
    return [major, major, avg, avg];
  }
  const value = Number(notation);
  return [value, value, value, value];
}

export function normalizeGCSCharacter(record: GCSRecord): CharacterDTO {
  const assumptions: string[] = [];
  const name = record.profile?.name ?? "Unnamed";
  const id = record.id ?? name.toLowerCase().replace(/\s+/g, "-");

  const attributes = {
    ST: extractAttribute(record, "st", 10, assumptions),
    DX: extractAttribute(record, "dx", 10, assumptions),
    IQ: extractAttribute(record, "iq", 10, assumptions),
    HT: extractAttribute(record, "ht", 10, assumptions),
    HP: extractDerivedAttribute(record, "hp", 10, assumptions),
    FP: extractDerivedAttribute(record, "fp", 10, assumptions),
    Will: extractDerivedAttribute(record, "will", 10, assumptions),
    Per: extractDerivedAttribute(record, "per", 10, assumptions),
    BasicMove: extractDerivedAttribute(record, "basic_move", 5, assumptions)
  };

  const defenses = {
    Dodge: record.calc?.dodge?.[0] ?? 8,
    Parry: extractDefense(record.calc?.parry, assumptions, "Parry"),
    Block: extractDefense(record.calc?.block, assumptions, "Block"),
    DB: 0
  };

  const move = record.calc?.move?.[0] ?? attributes.BasicMove;
  const dr = extractDR(record, assumptions);
  const traits = buildTraits(record);
  const attacksSource = [...(record.equipment ?? []), ...(record.attacks ?? [])];
  const attacks = attacksSource.map((weapon) => normalizeAttack(record, weapon, assumptions)).filter(Boolean);
  if (attacks.length === 0) {
    assumptions.push("No Attack entries found in GCS file");
  }

  return {
    id,
    name,
    faction: "neutral",
    attributes,
    defenses,
    move,
    dr,
    hardened: undefined,
    traits,
    energyReserves: undefined,
    specialDRPoints: undefined,
    vulnerabilitiesPoints: undefined,
    healing: {},
    attacks,
    notes: record.notes,
    assumptions
  };
}

export function normalizeGCSCharacters(records: GCSRecord[]): CharacterDTO[] {
  return records.map((record) => normalizeGCSCharacter(record));
}
