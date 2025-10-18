import { damageTypeMultiplier, averageDamage, rofBonus } from "../utils/dice";
import type {
  AttackDTO,
  CharacterCER,
  CharacterDTO,
  DefenseBreakdown,
  EncounterSummary,
  OffenseBreakdown
} from "./types";

const MIN_CER = 1;

const TRAIT_ALIASES: Record<string, string> = {
  "Trained by a Master": "TbAM",
  "Weapon Master": "WM",
  "Heroic Archer": "HeroicArcher",
  "Extra Attack": "ExtraAttack",
  "Altered Time Rate": "ATR",
  "Enhanced Move": "EnhancedMove",
  "High Pain Threshold": "HPT",
  "Combat Reflexes": "CombatReflexes",
  "Very Fit": "VeryFit",
  "Fit": "Fit",
  "Hard to Kill": "HardToKill",
  "Hard to Subdue": "HardToSubdue",
  "Fearlessness": "Fearlessness",
  "Recovery": "Recovery",
  "Rapid Healing": "RapidHealing",
  "Regeneration": "Regeneration",
  "Unfazeable": "Unfazeable"
};

function getTraitValue(character: CharacterDTO, name: string): number {
  const normalized = TRAIT_ALIASES[name] ?? name;
  const value = character.traits[normalized];
  if (typeof value === "number") {
    return value;
  }
  if (value === true) {
    return 1;
  }
  return 0;
}

function hasTrait(character: CharacterDTO, name: string): boolean {
  return getTraitValue(character, name) > 0;
}

function armorDivisorBonus(ad: number | undefined): number {
  if (!ad || ad <= 1) {
    return 0;
  }
  if (ad <= 2) return 5;
  if (ad <= 3) return 10;
  if (ad <= 10) return 15;
  if (ad <= 100) return 20;
  return 25;
}

function rapidFireMultiplier(attack: AttackDTO): number {
  return 1 + rofBonus(attack.rof);
}

function cyclesPerFifteenSeconds(attack: AttackDTO): number {
  if (!attack.cycles) {
    return 1;
  }
  const { count, periodSec } = attack.cycles;
  if (periodSec <= 0) {
    return count;
  }
  const cycles = Math.max(1, Math.floor(15 / periodSec)) * Math.max(1, count);
  return cycles;
}

function bestAttack(character: CharacterDTO): AttackDTO | undefined {
  if (!character.attacks.length) {
    return undefined;
  }
  const scored = character.attacks.map((attack) => {
    const damageScore = computeDamageBlock(character, attack).value;
    const skillScore = computeAttackSkillBlock(character, attack).value;
    return {
      attack,
      score: damageScore + skillScore
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.attack;
}

interface BlockResult {
  value: number;
  notes: string[];
}

function computeAttackSkillBlock(character: CharacterDTO, attack: AttackDTO): BlockResult {
  const notes: string[] = [];
  let effectiveSkill = attack.effectiveSkill;
  if (effectiveSkill == null) {
    effectiveSkill = 10;
    notes.push(`Assumed effective skill 10 for ${attack.name}`);
  }

  if (attack.mode !== "melee") {
    const acc = attack.acc ?? (attack.mode === "innate" ? 3 : 0);
    effectiveSkill += acc + 2;
  }

  const rofSkillBonus = rofBonus(attack.rof);
  if (rofSkillBonus > 0) {
    effectiveSkill += rofSkillBonus;
    notes.push(`Applied RoF skill bonus +${rofSkillBonus}`);
  }

  let blockValue = effectiveSkill - 10;

  if (hasTrait(character, "ExtraAttack")) {
    blockValue += 5;
    notes.push("Included Extra Attack bonus");
  }

  if (hasTrait(character, "TbAM") || hasTrait(character, "WM") || hasTrait(character, "HeroicArcher")) {
    blockValue += 3;
    notes.push("Applied TbAM/WM/Heroic Archer bonus");
  }

  if (attack.notes?.toLowerCase().includes("autohit")) {
    blockValue += 15;
    notes.push("Marked attack as auto-hit");
  }

  if (attack.costFP) {
    blockValue /= 2;
    notes.push("Halved skill contribution due to FP cost");
  }

  return { value: blockValue, notes };
}

function computeAfflictionBlock(character: CharacterDTO, attack: AttackDTO, damageBlock: number): BlockResult {
  const notes: string[] = [];
  const points = attack.afflictionPoints ?? 0;
  if (points <= 0) {
    return { value: 0, notes };
  }

  const effectScore = Math.floor(points / 5);
  if (effectScore <= 0) {
    return { value: 0, notes };
  }

  const hasDamage = damageBlock > 0;
  let value: number;
  if (!hasDamage) {
    value = effectScore;
  } else {
    const major = Math.max(damageBlock, effectScore);
    const minor = Math.min(damageBlock, effectScore);
    value = major + minor / 5;
  }

  if (attack.costFP) {
    value /= 2;
    notes.push("Halved affliction score due to FP cost");
  }

  return { value, notes };
}

function computeDamageBlock(character: CharacterDTO, attack: AttackDTO): BlockResult {
  const notes: string[] = [];
  const avg = averageDamage(attack.damage);
  if (avg <= 0) {
    return { value: 0, notes };
  }

  let multiplier = damageTypeMultiplier(attack.damage.type);
  if (attack.explosive) {
    multiplier += 0.5;
    notes.push("Added explosive damage modifier");
  }
  if (attack.vampiric) {
    multiplier += 1;
    notes.push("Added vampiric damage modifier");
  }

  let damage = avg * multiplier;

  damage *= cyclesPerFifteenSeconds(attack);

  const rfMult = rapidFireMultiplier(attack);
  if (rfMult > 1) {
    damage *= rfMult;
    notes.push(`Applied rapid fire multiplier x${rfMult}`);
  }

  const adBonus = armorDivisorBonus(attack.armorDivisor);
  if (adBonus) {
    damage += adBonus;
    notes.push(`Added armor divisor bonus +${adBonus}`);
  }

  if (attack.costFP) {
    damage /= 2;
    notes.push("Halved damage contribution due to FP cost");
  }

  return { value: damage, notes };
}

function computeFatigueBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  const fp = character.attributes.FP;
  if (Number.isNaN(fp)) {
    notes.push("FP not provided; assumed 0 contribution");
    return { value: 0, notes };
  }
  let value = fp - 10;
  if (character.energyReserves) {
    value += character.energyReserves;
  }
  const recovery = getTraitValue(character, "Recovery");
  if (recovery > 0) {
    value += Math.ceil(recovery / 5);
    notes.push("Included Recovery trait towards fatigue block");
  }
  return { value, notes };
}

function computeMoveBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  let move = character.move;
  const enhancedMove = getTraitValue(character, "EnhancedMove");
  if (enhancedMove > 0) {
    move *= Math.pow(2, enhancedMove);
    notes.push(`Enhanced Move level ${enhancedMove} applied`);
  }
  const value = move - 6;
  return { value, notes };
}

function computeActiveDefenseBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  const dodge = character.defenses.Dodge ?? 8;
  const parry = character.defenses.Parry;
  const block = character.defenses.Block;
  const db = character.defenses.DB ?? 0;

  let dodgeValue = 2 * (dodge - 8) + db;
  let parryValue = parry != null ? parry - 8 + db : Number.NEGATIVE_INFINITY;
  if (parryValue > Number.NEGATIVE_INFINITY && (hasTrait(character, "WM") || hasTrait(character, "TbAM"))) {
    parryValue += 1;
    notes.push("Weapon Master/TbAM parry bonus");
  }
  let blockValue = block != null ? block - 8 + db : Number.NEGATIVE_INFINITY;
  if (blockValue > Number.NEGATIVE_INFINITY && hasTrait(character, "WM")) {
    blockValue += 1;
    notes.push("Weapon Master block bonus");
  }

  const value = Math.max(dodgeValue, parryValue, blockValue);
  let total = value;

  const atr = getTraitValue(character, "ATR");
  if (atr > 0) {
    total += 20 * atr;
    notes.push(`Added ATR bonus ${20 * atr}`);
  }

  return { value: total, notes };
}

function computeDRBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  const { head, torso, arms, legs } = character.dr;
  const average = (head + torso + arms + legs) / 4;
  let value = average;
  if (character.hardened) {
    value += character.hardened * 5;
    notes.push(`Hardened DR level ${character.hardened}`);
  }
  if (character.specialDRPoints) {
    value += character.specialDRPoints;
  }
  if (character.vulnerabilitiesPoints) {
    value -= character.vulnerabilitiesPoints;
  }
  return { value, notes };
}

function computeHealthBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  let value = character.attributes.HT - 10;
  if (hasTrait(character, "Fit")) value += 1;
  if (hasTrait(character, "VeryFit")) value += 2;
  const htk = getTraitValue(character, "HardToKill");
  const hts = getTraitValue(character, "HardToSubdue");
  if (htk + hts > 0) {
    value += Math.ceil((htk + hts) / 2);
  }
  if (hasTrait(character, "HPT")) value += 2;
  if (hasTrait(character, "Recovery")) value += 2;
  return { value, notes };
}

function computeHPHealingBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  let value = character.attributes.HP - 10;
  const rapidHealing = getTraitValue(character, "RapidHealing");
  const recovery = getTraitValue(character, "Recovery");
  const regeneration = getTraitValue(character, "Regeneration");
  if (rapidHealing + recovery + regeneration > 0) {
    value += Math.ceil((rapidHealing + recovery + regeneration) / 5);
  }
  const healing = character.healing;
  const healScore = healing.healsOthersHP ? healing.healsOthersHP / 2 : 0;
  const fullRestore = healing.fullRestore ? 10 : 0;
  const removalScore = healing.removeConditionsPoints ? (healing.removeConditionsPoints ?? 0) / 5 : 0;
  value += Math.max(healScore, fullRestore, removalScore);
  return { value, notes };
}

function computeWillBlock(character: CharacterDTO): BlockResult {
  const notes: string[] = [];
  let value = character.attributes.Will - 10;
  const fearlessness = getTraitValue(character, "Fearlessness");
  if (fearlessness > 0) {
    value += Math.ceil(fearlessness / 2);
  }
  if (hasTrait(character, "CombatReflexes")) {
    value += 1;
  }
  if (hasTrait(character, "Unfazeable")) {
    value += 8;
  }
  return { value, notes };
}

export function calculateCharacterCER(character: CharacterDTO): CharacterCER {
  const assumptions = [...(character.assumptions ?? [])];
  const attack = bestAttack(character);
  if (!attack) {
    assumptions.push("No structured attacks found; offensive rating minimal");
  }

  const damageBlock = attack ? computeDamageBlock(character, attack) : { value: 0, notes: [] };
  const attackSkillBlock = attack ? computeAttackSkillBlock(character, attack) : { value: 0, notes: [] };
  const afflictionBlock = attack ? computeAfflictionBlock(character, attack, damageBlock.value) : { value: 0, notes: [] };
  const fatigueBlock = computeFatigueBlock(character);
  const moveBlock = computeMoveBlock(character);

  const OR: OffenseBreakdown = {
    attackSkill: attackSkillBlock.value,
    affliction: afflictionBlock.value,
    damage: damageBlock.value,
    fatigue: fatigueBlock.value,
    move: moveBlock.value,
    total:
      attackSkillBlock.value +
      afflictionBlock.value +
      damageBlock.value +
      fatigueBlock.value +
      moveBlock.value
  };

  const activeDefenseBlock = computeActiveDefenseBlock(character);
  const drBlock = computeDRBlock(character);
  const healthBlock = computeHealthBlock(character);
  const hpHealingBlock = computeHPHealingBlock(character);
  const willBlock = computeWillBlock(character);

  const PR: DefenseBreakdown = {
    activeDefense: activeDefenseBlock.value,
    dr: drBlock.value,
    health: healthBlock.value,
    hpHealing: hpHealingBlock.value,
    will: willBlock.value,
    total: activeDefenseBlock.value + drBlock.value + healthBlock.value + hpHealingBlock.value + willBlock.value
  };

  const CER = Math.max(MIN_CER, OR.total + PR.total);

  assumptions.push(...attackSkillBlock.notes, ...afflictionBlock.notes, ...damageBlock.notes, ...fatigueBlock.notes);
  assumptions.push(...activeDefenseBlock.notes, ...drBlock.notes, ...healthBlock.notes, ...hpHealingBlock.notes, ...willBlock.notes);

  return {
    character,
    OR,
    PR,
    CER,
    assumptions
  };
}

export function summarizeEncounter(characters: CharacterCER[], situationalMultiplier = 1, fatigueMultiplier = 1): EncounterSummary {
  const party = characters.filter((c) => c.character.faction === "party");
  const opposition = characters.filter((c) => c.character.faction === "opposition");

  const partyCER = party.reduce((acc, entry) => acc + entry.CER * fatigueMultiplier, 0);
  const oppositionCER = opposition.reduce((acc, entry) => acc + entry.CER, 0) * situationalMultiplier;

  const ratio = oppositionCER === 0 ? Infinity : partyCER / oppositionCER;

  let threatClass: EncounterSummary["threatClass"];
  if (ratio >= 11) threatClass = "Nuisance";
  else if (ratio >= 3) threatClass = "Fodder";
  else if (ratio >= 0.49) threatClass = "Worthy";
  else if (ratio >= 0.1) threatClass = "Boss";
  else threatClass = "Epic";

  return { partyCER, oppositionCER, ratio, threatClass };
}

export { armorDivisorBonus };
