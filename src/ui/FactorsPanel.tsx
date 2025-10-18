import { useAppStore } from "./store";

const FactorsPanel = () => {
  const { factors, activeFactorIds, toggleFactor } = useAppStore((state) => ({
    factors: state.factors,
    activeFactorIds: state.activeFactorIds,
    toggleFactor: state.toggleFactor
  }));

  return (
    <section>
      <h2>Situational factors</h2>
      <p>Each active factor adds +20% to opposition CER (multiplicatively).</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {factors.map((factor) => {
          const active = activeFactorIds.has(factor.id);
          return (
            <button
              key={factor.id}
              onClick={() => toggleFactor(factor.id)}
              style={{
                backgroundColor: active ? "#d6336c" : "#1a1a1a",
                borderColor: active ? "#d6336c" : "transparent"
              }}
            >
              {factor.label}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default FactorsPanel;
