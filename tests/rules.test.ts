import { describe, expect, it } from "vitest";
import { calculateCharacterCER, summarizeEncounter, armorDivisorBonus } from "../src/domain/rules";
import { damageTypeMultiplier, rofBonus } from "../src/utils/dice";
import type { CharacterDTO } from "../src/domain/types";

const baseCharacter: CharacterDTO = {
  id: "test",
  name: "Test",
  faction: "neutral",
  attributes: {
    ST: 10,
    DX: 10,
    IQ: 10,
    HT: 10,
    HP: 10,
    FP: 10,
    Will: 10,
    Per: 10,
    BasicMove: 5
  },
  defenses: { Dodge: 8 },
  move: 5,
  dr: { head: 0, torso: 0, arms: 0, legs: 0 },
  traits: {},
  healing: {},
  attacks: []
};

describe("dice helpers", () => {
  it("applies damage type multipliers", () => {
    expect(damageTypeMultiplier("pi-")).toBe(0.5);
    expect(damageTypeMultiplier("cr")).toBe(1);
    expect(damageTypeMultiplier("cut")).toBe(1.5);
    expect(damageTypeMultiplier("imp")).toBe(2);
  });

  it("uses rapid-fire bonus table", () => {
    expect(rofBonus(1)).toBe(0);
    expect(rofBonus(2)).toBe(1);
    expect(rofBonus(8)).toBe(3);
  });
});

describe("armor divisor bonus", () => {
  it("awards staircase bonuses", () => {
    expect(armorDivisorBonus(1)).toBe(0);
    expect(armorDivisorBonus(2)).toBe(5);
    expect(armorDivisorBonus(3)).toBe(10);
    expect(armorDivisorBonus(10)).toBe(15);
  });
});

describe("calculateCharacterCER", () => {
  it("applies rapid fire multiplier in damage block", () => {
    const character: CharacterDTO = {
      ...baseCharacter,
      attacks: [
        {
          name: "SMG",
          mode: "ranged",
          effectiveSkill: 14,
          acc: 3,
          rof: 10,
          damage: { dice: 3, adds: 0, type: "pi" }
        }
      ]
    };
    const result = calculateCharacterCER(character);
    expect(result.OR.damage).toBeGreaterThan(0);
    expect(result.OR.damage).toBeGreaterThan(40);
  });

  it("adds ATR to active defense", () => {
    const character: CharacterDTO = {
      ...baseCharacter,
      traits: { ATR: 1 },
      defenses: { Dodge: 10 }
    };
    const result = calculateCharacterCER(character);
    expect(result.PR.activeDefense).toBeGreaterThan(20);
  });

  it("computes combined CER and encounter ratio", () => {
    const attacker: CharacterDTO = {
      ...baseCharacter,
      id: "attacker",
      name: "Attacker",
      faction: "party",
      attacks: [
        {
          name: "Sword",
          mode: "melee",
          effectiveSkill: 14,
          damage: { dice: 2, adds: 1, type: "cut" }
        }
      ]
    };
    const defender: CharacterDTO = {
      ...baseCharacter,
      id: "defender",
      name: "Defender",
      faction: "opposition",
      defenses: { Dodge: 9 },
      dr: { head: 2, torso: 4, arms: 2, legs: 2 },
      attacks: [
        {
          name: "Bite",
          mode: "melee",
          effectiveSkill: 12,
          damage: { dice: 1, adds: 0, type: "imp" }
        }
      ]
    };

    const partyCER = calculateCharacterCER(attacker);
    const oppositionCER = calculateCharacterCER(defender);
    const summary = summarizeEncounter([partyCER, oppositionCER], 1, 1);

    expect(summary.partyCER).toBeGreaterThan(1);
    expect(summary.oppositionCER).toBeGreaterThan(1);
    expect(summary.ratio).toBeGreaterThan(0);
  });
});
