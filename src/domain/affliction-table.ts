/**
 * Rough cost reference for common afflictions. Values are based on GURPS effect pricing.
 * Extend as more data becomes available. Keys should match normalized attack notes from GCS.
 */
export const AFFLICTION_COSTS: Record<string, number> = {
  stun: 10,
  paralysis: 15,
  sleep: 30,
  heartAttack: 60,
  terror: 20,
  fear: 10,
  nausea: 5,
  stunTouch: 12
};

export function lookupAfflictionCost(name: string | undefined): number | undefined {
  if (!name) {
    return undefined;
  }
  const key = name.trim().toLowerCase();
  const entry = Object.entries(AFFLICTION_COSTS).find(([effect]) => effect.toLowerCase() === key);
  return entry?.[1];
}
