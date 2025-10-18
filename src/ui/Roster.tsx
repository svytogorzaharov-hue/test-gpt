import { ChangeEvent } from "react";
import { useAppStore } from "./store";
import type { CharacterDTO } from "../domain/types";

async function readFiles(files: FileList | null): Promise<unknown[]> {
  if (!files) return [];
  const results: unknown[] = [];
  for (const file of Array.from(files)) {
    const text = await file.text();
    try {
      results.push(JSON.parse(text));
    } catch (error) {
      console.error(`Failed to parse ${file.name}`, error);
    }
  }
  return results;
}

const factions: CharacterDTO["faction"][] = ["party", "opposition", "neutral"];

const Roster = () => {
  const { characters, cer, importRecords, toggleFaction } = useAppStore((state) => ({
    characters: state.characters,
    cer: state.cer,
    importRecords: state.importRecords,
    toggleFaction: state.toggleFaction
  }));

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const records = await readFiles(event.target.files);
    if (records.length) {
      importRecords(records);
    }
  };

  return (
    <section>
      <h2>Roster</h2>
      <label>
        Import .gcs/.json files
        <input type="file" accept=".gcs,.json" multiple onChange={handleImport} />
      </label>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Faction</th>
            <th>OR</th>
            <th>PR</th>
            <th>CER</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((character) => {
            const entry = cer.find((item) => item.character.id === character.id);
            return (
              <tr key={character.id}>
                <td>{character.name}</td>
                <td>
                  {factions.map((faction) => (
                    <label key={faction} style={{ marginRight: "0.5rem" }}>
                      <input
                        type="radio"
                        name={`${character.id}-faction`}
                        value={faction}
                        checked={character.faction === faction}
                        onChange={() => toggleFaction(character.id, faction)}
                      />
                      {faction}
                    </label>
                  ))}
                </td>
                <td>{entry?.OR.total.toFixed(2) ?? "—"}</td>
                <td>{entry?.PR.total.toFixed(2) ?? "—"}</td>
                <td>{entry?.CER.toFixed(2) ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};

export default Roster;
