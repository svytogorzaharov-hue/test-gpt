import type { DamageProfile, DamageType } from "../domain/types";

const DAMAGE_RE = /(?<dice>\d+)d(?<adds>[+-]\d+)?\s*(?<type>cr|cut|imp|cor|fat|pi\+\+|pi\+|pi-|pi)?/i;
const ARMOR_DIVISOR_RE = /AD\s*[:=]?\s*(?<ad>\d+)/i;
const EXPLOSIVE_RE = /\bex(plosive)?\b/i;
const VAMPIRIC_RE = /\b(vampiric|drain)\b/i;
const CYCLES_RE = /cyc\s*\((?<count>\d+)x(?<period>\d+)s\)/i;
const COST_FP_RE = /fp\s*[:=]?\s*(?<fp>\d+)/i;

export interface ParsedDamageString {
  damage: DamageProfile;
  armorDivisor?: number;
  explosive?: boolean;
  vampiric?: boolean;
  cycles?: { count: number; periodSec: number };
  costFP?: number;
}

const DEFAULT_DAMAGE: DamageProfile = { dice: 0, adds: 0, type: "cr" };

export function parseDamageString(raw: string | undefined | null): ParsedDamageString {
  if (!raw) {
    return { damage: { ...DEFAULT_DAMAGE } };
  }
  const text = raw.trim();
  const match = text.match(DAMAGE_RE);
  const damage: DamageProfile = match
    ? {
        dice: Number(match.groups?.dice ?? 0),
        adds: Number(match.groups?.adds ?? 0),
        type: (match.groups?.type?.toLowerCase() ?? "cr") as DamageType
      }
    : { ...DEFAULT_DAMAGE };

  const adMatch = text.match(ARMOR_DIVISOR_RE);
  const cyclesMatch = text.match(CYCLES_RE);
  const costFPMatch = text.match(COST_FP_RE);

  return {
    damage,
    armorDivisor: adMatch ? Number(adMatch.groups?.ad ?? 1) : undefined,
    explosive: EXPLOSIVE_RE.test(text) || undefined,
    vampiric: VAMPIRIC_RE.test(text) || undefined,
    cycles: cyclesMatch
      ? { count: Number(cyclesMatch.groups?.count ?? 1), periodSec: Number(cyclesMatch.groups?.period ?? 1) }
      : undefined,
    costFP: costFPMatch ? Number(costFPMatch.groups?.fp ?? 0) : undefined
  };
}

const ROF_TABLE: { max: number; bonus: number }[] = [
  { max: 1, bonus: 0 },
  { max: 2, bonus: 1 },
  { max: 4, bonus: 2 },
  { max: 8, bonus: 3 },
  { max: 12, bonus: 4 },
  { max: 24, bonus: 5 },
  { max: 49, bonus: 6 },
  { max: 99, bonus: 7 },
  { max: Number.POSITIVE_INFINITY, bonus: 8 }
];

export function rofBonus(rof: number | undefined | null): number {
  if (!rof || rof <= 1) {
    return 0;
  }
  const entry = ROF_TABLE.find((row) => rof <= row.max) ?? ROF_TABLE[ROF_TABLE.length - 1];
  return entry.bonus;
}

export function averageDamage({ dice, adds }: DamageProfile): number {
  return Math.ceil(dice * 3.5 + adds);
}

export function damageTypeMultiplier(type: DamageType): number {
  switch (type) {
    case "pi-":
      return 0.5;
    case "cr":
    case "pi":
      return 1;
    case "cut":
    case "pi+":
      return 1.5;
    case "cor":
    case "fat":
    case "pi++":
    case "imp":
      return 2;
    default:
      return 1;
  }
}
