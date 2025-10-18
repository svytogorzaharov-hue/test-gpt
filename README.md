# CER Encounter Planner

Offline-first web application that imports GURPS Character Sheet (.gcs) files, normalises them into a
consistent DTO and calculates Combat Effectiveness Ratings (CER) using the OR/PR methodology. The
UI helps build parties and opposition groups, layer situational modifiers, model fatigue, and export
auditable reports.

## Getting started

```bash
pnpm install
pnpm dev
```

Visit http://localhost:5173 to load the interface.

### Testing

```bash
pnpm test
```

### Linting

```bash
pnpm lint
```

## How CER is calculated

The rule engine lives in [`src/domain/rules.ts`](src/domain/rules.ts). Each character receives
Offensive Rating (OR) and Protective Rating (PR) breakdowns that mirror the specification in the
prompt:

- **Attack skill:** Best attack skill after Acc, RoF, Extra Attack, Weapon Master/TbAM/Heroic Archer
  bonuses. FP-costing attacks halve the result.
- **Affliction:** Converts GURPS advantage points into impact. Attacks combining damage and affliction
  take the larger component plus one fifth of the smaller, again halved by FP costs.
- **Damage:** Average dice (`ceil(3.5d + adds)`) scaled by damage type multipliers, with extra factors
  for explosive/vampiric attacks, armor divisors, rapid fire and cyclic effects.
- **Fatigue:** FP above 10, energy reserves and recovery traits.
- **Move:** Current move minus 6, including Enhanced Move multiplication.

PR combines highest active defense (with DB and ATR), averaged DR with Hardened and resistances,
Health/Fit/HPT, HP and healing traits, and mental resilience (Will, Fearlessness, Combat Reflexes,
Unfazeable).

Group summaries in `summarizeEncounter` apply situational multipliers and fatigue scaling before
classifying the threat level from Nuisance to Epic.

## Normalising GCS data

[`src/domain/gcs-normalizer.ts`](src/domain/gcs-normalizer.ts) parses the GCS v5 JSON schema. When a
field is missing we append a human-readable assumption to the DTO, ensuring downstream UI and exports
highlight every gap. Attacks are extracted from structured weapon/attack blocks, damage strings are
parsed by [`src/utils/dice.ts`](src/utils/dice.ts), and DR is approximated from equipment notes when
explicit DR blocks are absent.

## Exporting reports

`src/services/export.ts` can produce JSON traces or a printable PDF using `pdf-lib`. The JSON payload
includes every character CER breakdown, encounter summary, situational multipliers and fatigue level
for reproducibility.

## Example fixture

A minimal sample .gcs file used by tests lives in [`tests/fixtures/sample.gcs`](tests/fixtures/sample.gcs).
It demonstrates how the normalizer handles partial data while keeping the application resilient.
