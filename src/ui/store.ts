import { create } from "zustand";
import { calculateCharacterCER, summarizeEncounter } from "../domain/rules";
import { normalizeGCSCharacter } from "../domain/gcs-normalizer";
import type { CharacterCER, CharacterDTO } from "../domain/types";
import { saveState, loadState } from "../services/storage";

export type FatigueLevel = 1 | 0.75 | 0.5;

export interface SituationalFactor {
  id: string;
  label: string;
  modifier: number;
  neutralizedBy?: string;
}

export interface AppState {
  characters: CharacterDTO[];
  cer: CharacterCER[];
  factors: SituationalFactor[];
  activeFactorIds: Set<string>;
  fatigue: FatigueLevel;
  summary: ReturnType<typeof summarizeEncounter>;
  importRecords: (json: unknown[]) => void;
  toggleFaction: (id: string, faction: CharacterDTO["faction"]) => void;
  toggleFactor: (id: string) => void;
  setFatigue: (level: FatigueLevel) => void;
  recompute: () => void;
  loadPersisted: () => Promise<void>;
}

const DEFAULT_FACTORS: SituationalFactor[] = [
  { id: "darkness", label: "Low visibility", modifier: 1.2, neutralizedBy: "Night Vision" },
  { id: "terrain", label: "Difficult terrain", modifier: 1.2 },
  { id: "surprise", label: "Surprised party", modifier: 1.2 },
  { id: "prep", label: "Prepared opposition", modifier: 1.2 }
];

function computeSummary(characters: CharacterDTO[], cer: CharacterCER[], activeFactorIds: Set<string>, fatigue: FatigueLevel) {
  const situationalMultiplier = Array.from(activeFactorIds).reduce((acc, id) => {
    const factor = DEFAULT_FACTORS.find((item) => item.id === id);
    return factor ? acc * factor.modifier : acc;
  }, 1);
  return summarizeEncounter(cer, situationalMultiplier, fatigue);
}

export const useAppStore = create<AppState>((set, get) => ({
  characters: [],
  cer: [],
  factors: DEFAULT_FACTORS,
  activeFactorIds: new Set<string>(),
  fatigue: 1,
  summary: { partyCER: 0, oppositionCER: 0, ratio: Infinity, threatClass: "Epic" },
  importRecords: (json) => {
    const characters = json.map((item) => normalizeGCSCharacter(item as any));
    set({ characters });
    get().recompute();
  },
  toggleFaction: (id, faction) => {
    set((state) => ({
      characters: state.characters.map((character) =>
        character.id === id ? { ...character, faction } : character
      )
    }));
    get().recompute();
  },
  toggleFactor: (id) => {
    set((state) => {
      const next = new Set(state.activeFactorIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { activeFactorIds: next };
    });
    get().recompute();
  },
  setFatigue: (level) => {
    set({ fatigue: level });
    get().recompute();
  },
  recompute: () => {
    const { characters, activeFactorIds, fatigue } = get();
    const cer = characters.map((character) => calculateCharacterCER(character));
    const summary = computeSummary(characters, cer, activeFactorIds, fatigue);
    set({ cer, summary });
    saveState({ characters, factors: Array.from(activeFactorIds), fatigue }).catch(console.error);
  },
  loadPersisted: async () => {
    const state = await loadState();
    if (!state) return;
    set({ characters: state.characters, activeFactorIds: new Set(state.factors), fatigue: state.fatigue as FatigueLevel });
    get().recompute();
  }
}));
