import { useState } from "react";
import type { CharacterCER } from "../domain/types";

interface Props {
  entry: CharacterCER;
}

const tabs = ["OR", "PR", "Raw"] as const;

type Tab = (typeof tabs)[number];

const CharacterCard = ({ entry }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("OR");

  return (
    <article style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3>{entry.character.name}</h3>
        <span>CER: {entry.CER.toFixed(2)}</span>
      </header>
      <nav style={{ marginBottom: "1rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              marginRight: "0.5rem",
              backgroundColor: activeTab === tab ? "#0b7285" : "#1a1a1a"
            }}
          >
            {tab}
          </button>
        ))}
      </nav>
      {activeTab === "OR" && (
        <table className="table">
          <tbody>
            <tr>
              <th>Attack skill</th>
              <td>{entry.OR.attackSkill.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Affliction</th>
              <td>{entry.OR.affliction.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Damage</th>
              <td>{entry.OR.damage.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Fatigue</th>
              <td>{entry.OR.fatigue.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Move</th>
              <td>{entry.OR.move.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Total</th>
              <td>{entry.OR.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {activeTab === "PR" && (
        <table className="table">
          <tbody>
            <tr>
              <th>Active defense</th>
              <td>{entry.PR.activeDefense.toFixed(2)}</td>
            </tr>
            <tr>
              <th>DR</th>
              <td>{entry.PR.dr.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Health</th>
              <td>{entry.PR.health.toFixed(2)}</td>
            </tr>
            <tr>
              <th>HP/Healing</th>
              <td>{entry.PR.hpHealing.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Will</th>
              <td>{entry.PR.will.toFixed(2)}</td>
            </tr>
            <tr>
              <th>Total</th>
              <td>{entry.PR.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {activeTab === "Raw" && (
        <div>
          <h4>Assumptions</h4>
          {entry.assumptions.length === 0 ? <p>No assumptions recorded.</p> : null}
          <ul>
            {entry.assumptions.map((assumption, index) => (
              <li key={`${entry.character.id}-assumption-${index}`}>{assumption}</li>
            ))}
          </ul>
          <details>
            <summary>Raw DTO</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(entry.character, null, 2)}</pre>
          </details>
        </div>
      )}
    </article>
  );
};

export default CharacterCard;
