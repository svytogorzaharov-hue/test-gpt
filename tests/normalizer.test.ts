import { describe, expect, it } from "vitest";
import { normalizeGCSCharacter } from "../src/domain/gcs-normalizer";
import fs from "fs";
import path from "path";

const fixturePath = path.resolve(__dirname, "fixtures", "sample.gcs");

describe("normalizeGCSCharacter", () => {
  it("creates a DTO and records assumptions when data is missing", () => {
    const file = fs.readFileSync(fixturePath, "utf-8");
    const json = JSON.parse(file);
    const dto = normalizeGCSCharacter(json);

    expect(dto.name).toBe("Sample Hero");
    expect(dto.attacks.length).toBeGreaterThan(0);
    expect(dto.defenses.Dodge).toBe(9);
    expect(dto.assumptions?.length).toBeGreaterThan(0);
  });

  it("handles empty attack lists", () => {
    const dto = normalizeGCSCharacter({ profile: { name: "No Attacks" } } as any);
    expect(dto.attacks).toHaveLength(0);
    expect(dto.assumptions).toContain("No Attack entries found in GCS file");
  });
});
