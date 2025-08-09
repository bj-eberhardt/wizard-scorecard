import React, { useState } from "react";
import useSettingsStore from "../store/settingsStore";

interface ConfigureGameProps {
  onStart: (names: string[], useWolke: boolean) => void;
}

const ConfigureGame: React.FC<ConfigureGameProps> = ({ onStart }) => {
  const MAX_PLAYERS = 6;
  const playerNames = useSettingsStore((state) => state.playerNames);
  const setPlayerNames = useSettingsStore((state) => state.setPlayerNames);
  const useAnniversaryRules = useSettingsStore((state) => state.useAnniversaryRules);
  const setUseAnniversaryRules = useSettingsStore((state) => state.setUseAnniversaryRules);

  const initialNames = [
    ...playerNames,
    ...Array(MAX_PLAYERS - playerNames.length).fill("")
  ].slice(0, MAX_PLAYERS);
  const [namesInput, setNamesInput] = useState<string[]>(initialNames);
  const [useWolke, setUseWolke] = useState(useAnniversaryRules);
  const [error, setError] = useState<string | null>(null);

  const removeName = (idx: number) => {
    const copy = [...namesInput];
    copy[idx] = '';
    setNamesInput(copy);
  };

  const handleStart = () => {
    const trimmed = namesInput.map(n => n.trim());
    const firstEmpty = trimmed.findIndex(n => n === '');
    const afterEmptyFilled = firstEmpty !== -1 ? trimmed.slice(firstEmpty + 1).some(n => n !== '') : false;

    if (afterEmptyFilled) {
      setError('Spielernamen müssen von oben nach unten lückenlos eingegeben werden.');
      return;
    }

    const trimmedNames = namesInput.map((n) => n.trim()).filter((n) => n !== "");
    if (trimmedNames.length < 3) {
      setError("Mindestens 3 Spieler erforderlich.");
      return;
    }
    if (trimmedNames.length > MAX_PLAYERS) {
      setError(`Maximal ${MAX_PLAYERS} Spieler erlaubt.`);
      return;
    }
    if (new Set(trimmedNames).size !== trimmedNames.length) {
      setError("Jeder Name muss einzigartig sein.");
      return;
    }
    setPlayerNames(trimmedNames);
    setUseAnniversaryRules(useWolke);
    setError(null);
    onStart(trimmedNames, useWolke);
  };

  return (<div className="mt-8">
      <div className="font-semibold">
        Bitte gib die Namen der Spieler ein:
      </div>
    <div className="text-center flex flex-col gap-2 max-w-md mx-auto mt-8">
      {namesInput.map((name, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">

          <input
          key={i}
          type="text"
          value={name}
          placeholder={`Spieler ${i + 1}`}
          onChange={e => {
            const copy = [...namesInput];
            copy[i] = e.target.value;
            setNamesInput(copy);
          }}
          className="border p-1 w-full"
        />
      {name && (
        <button onClick={() => removeName(i)} className="px-2 py-1 text-red-600" aria-label={`Entferne Spieler ${i+1}`}>
      ×
    </button>
      )}</div>

    ))}
      <label className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          checked={useWolke}
          onChange={e => setUseWolke(e.target.checked)}
        />
        Wizard Jubiläumsversion (mit Wolke)
      </label>
      {error && <div className="text-red-500">{error}</div>}
      <button onClick={handleStart} className="bg-blue-500 text-white px-4 py-2 rounded mt-4">
        Spiel starten
      </button>
    </div>
  </div>
  );
};

export default ConfigureGame;
