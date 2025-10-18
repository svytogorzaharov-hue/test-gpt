export type DamageType =
  | "cr"
  | "cut"
  | "imp"
  | "cor"
  | "fat"
  | "pi-"
  | "pi"
  | "pi+"
  | "pi++";

export type AttackMode = "melee" | "ranged" | "innate";

export interface DamageProfile {
  dice: number;
  adds: number;
  type: DamageType;
}

export interface AttackDTO {
  name: string;
  mode: AttackMode;
  skillName?: string;
  effectiveSkill?: number;
  acc?: number;
  rof?: number;
  rcl?: number;
  damage: DamageProfile;
  armorDivisor?: number;
  explosive?: boolean;
  vampiric?: boolean;
  cycles?: { count: number; periodSec: number };
  afflictionPoints?: number;
  costFP?: number;
  notes?: string;
}

export interface CharacterDTO {
  id: string;
  name: string;
  faction: "party" | "opposition" | "neutral";
  attributes: {
    ST: number;
    DX: number;
    IQ: number;
    HT: number;
    HP: number;
    FP: number;
    Will: number;
    Per: number;
    BasicMove: number;
  };
  defenses: {
    Dodge: number;
    Parry?: number;
    Block?: number;
    DB?: number;
  };
  move: number;
  dr: {
    head: number;
    torso: number;
    arms: number;
    legs: number;
  };
  hardened?: number;
  traits: Record<string, number | boolean>;
  energyReserves?: number;
  specialDRPoints?: number;
  vulnerabilitiesPoints?: number;
  healing: {
    healsOthersHP?: number;
    fullRestore?: boolean;
    removeConditionsPoints?: number;
  };
  attacks: AttackDTO[];
  notes?: string;
  assumptions?: string[];
}

export interface OffenseBreakdown {
  attackSkill: number;
  affliction: number;
  damage: number;
  fatigue: number;
  move: number;
  total: number;
}

export interface DefenseBreakdown {
  activeDefense: number;
  dr: number;
  health: number;
  hpHealing: number;
  will: number;
  total: number;
}

export interface CharacterCER {
  character: CharacterDTO;
  OR: OffenseBreakdown;
  PR: DefenseBreakdown;
  CER: number;
  assumptions: string[];
}

export interface EncounterSummary {
  partyCER: number;
  oppositionCER: number;
  ratio: number;
  threatClass: "Nuisance" | "Fodder" | "Worthy" | "Boss" | "Epic";
}

export interface ExportPayload {
  timestamp: string;
  characters: CharacterCER[];
  encounter: EncounterSummary;
  situationalMultipliers: number[];
  fatigueLevel: number;
}
