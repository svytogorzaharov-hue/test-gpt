import { useMemo } from "react";
import { useAppStore } from "./store";
import { buildJSONReport, buildPDFReport, toExportPayload } from "../services/export";

const fatigueLevels = [
  { label: "100%", value: 1 },
  { label: "75%", value: 0.75 },
  { label: "50%", value: 0.5 }
] as const;

const Encounter = () => {
  const { cer, summary, fatigue, setFatigue, factors, activeFactorIds } = useAppStore((state) => ({
    cer: state.cer,
    summary: state.summary,
    fatigue: state.fatigue,
    setFatigue: state.setFatigue,
    factors: state.factors,
    activeFactorIds: state.activeFactorIds
  }));

  const multipliers = useMemo(
    () =>
      Array.from(activeFactorIds).map((id) => factors.find((factor) => factor.id === id)?.modifier ?? 1),
    [activeFactorIds, factors]
  );

  const handleExportJSON = () => {
    const payload = toExportPayload(cer, summary, multipliers, fatigue);
    const blob = new Blob([buildJSONReport(payload)], { type: "application/json" });
    downloadBlob(blob, `cer-report-${payload.timestamp}.json`);
  };

  const handleExportPDF = async () => {
    const payload = toExportPayload(cer, summary, multipliers, fatigue);
    const pdfBytes = await buildPDFReport(payload);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    downloadBlob(blob, `cer-report-${payload.timestamp}.pdf`);
  };

  return (
    <section>
      <h2>Encounter</h2>
      <p>
        Party CER: <strong>{summary.partyCER.toFixed(2)}</strong> — Opposition CER:
        <strong> {summary.oppositionCER.toFixed(2)}</strong>
      </p>
      <p>
        N = {Number.isFinite(summary.ratio) ? summary.ratio.toFixed(2) : "∞"} — Threat class:
        <strong> {summary.threatClass}</strong>
      </p>
      <div>
        Fatigue:
        {fatigueLevels.map((level) => (
          <label key={level.value} style={{ marginLeft: "0.5rem" }}>
            <input
              type="radio"
              name="fatigue"
              value={level.value}
              checked={fatigue === level.value}
              onChange={() => setFatigue(level.value)}
            />
            {level.label}
          </label>
        ))}
      </div>
      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleExportJSON} disabled={cer.length === 0}>
          Export JSON
        </button>
        <button onClick={handleExportPDF} disabled={cer.length === 0} style={{ marginLeft: "0.5rem" }}>
          Export PDF
        </button>
      </div>
    </section>
  );
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default Encounter;
