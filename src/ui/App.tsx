import { useEffect } from "react";
import Encounter from "./Encounter";
import Roster from "./Roster";
import CharacterCard from "./CharacterCard";
import FactorsPanel from "./FactorsPanel";
import { useAppStore } from "./store";

const App = () => {
  const { cer, loadPersisted } = useAppStore((state) => ({
    cer: state.cer,
    loadPersisted: state.loadPersisted
  }));

  useEffect(() => {
    loadPersisted().catch(console.error);
  }, [loadPersisted]);

  return (
    <div>
      <h1>CER Encounter Planner</h1>
      <p>
        Import GURPS Character Sheet files (.gcs or JSON) to compute Offensive Rating (OR), Protective
        Rating (PR) and combined Combat Effectiveness Rating (CER).
      </p>
      <Roster />
      <Encounter />
      <FactorsPanel />
      <section>
        <h2>Characters</h2>
        {cer.length === 0 && <p>No characters imported yet.</p>}
        {cer.map((entry) => (
          <CharacterCard key={entry.character.id} entry={entry} />
        ))}
      </section>
      <footer>
        <small>
          Data is stored locally in IndexedDB. Missing fields in the source sheet are recorded as
          explicit assumptions for auditability.
        </small>
      </footer>
    </div>
  );
};

export default App;
