import { PDFDocument, StandardFonts } from "pdf-lib";
import type { CharacterCER, ExportPayload } from "../domain/types";

export function buildJSONReport(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

export async function buildPDFReport(payload: ExportPayload): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lineHeight = 14;
  let cursorY = height - 50;

  const writeLine = (text: string, indent = 0) => {
    page.drawText(text, {
      x: 40 + indent * 20,
      y: cursorY,
      size: 10,
      font
    });
    cursorY -= lineHeight;
    if (cursorY < 40) {
      cursorY = height - 50;
    }
  };

  writeLine(`Encounter summary - ${payload.timestamp}`);
  writeLine(`Party CER: ${payload.encounter.partyCER.toFixed(2)}`);
  writeLine(`Opposition CER: ${payload.encounter.oppositionCER.toFixed(2)}`);
  writeLine(`Ratio N: ${payload.encounter.ratio.toFixed(2)} (${payload.encounter.threatClass})`);
  writeLine(`Situational multipliers: ${payload.situationalMultipliers.join(" × ") || "1.0"}`);
  writeLine(`Fatigue multiplier: ${payload.fatigueLevel}`);
  cursorY -= lineHeight;

  payload.characters.forEach((entry) => {
    writeLine(`${entry.character.name} — CER ${entry.CER.toFixed(2)}`);
    writeLine(`OR breakdown:`, 1);
    writeLine(
      `Skill ${entry.OR.attackSkill.toFixed(2)}, Affliction ${entry.OR.affliction.toFixed(2)}, Damage ${entry.OR.damage.toFixed(2)}, Fatigue ${entry.OR.fatigue.toFixed(2)}, Move ${entry.OR.move.toFixed(2)}`,
      2
    );
    writeLine(`PR breakdown:`, 1);
    writeLine(
      `Active ${entry.PR.activeDefense.toFixed(2)}, DR ${entry.PR.dr.toFixed(2)}, Health ${entry.PR.health.toFixed(2)}, HP ${entry.PR.hpHealing.toFixed(2)}, Will ${entry.PR.will.toFixed(2)}`,
      2
    );
    if (entry.assumptions.length) {
      writeLine(`Assumptions:`, 1);
      entry.assumptions.slice(0, 5).forEach((assumption) => writeLine(assumption, 2));
      if (entry.assumptions.length > 5) {
        writeLine(`… and ${entry.assumptions.length - 5} more`, 2);
      }
    }
    cursorY -= lineHeight;
  });

  return pdfDoc.save();
}

export function toExportPayload(
  entries: CharacterCER[],
  encounter: ExportPayload["encounter"],
  situationalMultipliers: number[],
  fatigueLevel: number
): ExportPayload {
  return {
    timestamp: new Date().toISOString(),
    characters: entries,
    encounter,
    situationalMultipliers,
    fatigueLevel
  };
}
