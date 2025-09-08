import React, { useState } from 'react';
import useSettingsStore from '../store/settingsStore';
import { useTranslation } from 'react-i18next';

interface ConfigureGameProps {
  onStart: (names: string[], useWolke: boolean) => void;
}

const ConfigureGame: React.FC<ConfigureGameProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const MAX_PLAYERS = 6;
  const playerNames = useSettingsStore((state) => state.playerNames);
  const setPlayerNames = useSettingsStore((state) => state.setPlayerNames);
  const useAnniversaryRules = useSettingsStore((state) => state.useAnniversaryRules);
  const setUseAnniversaryRules = useSettingsStore((state) => state.setUseAnniversaryRules);

  const initialNames = [...playerNames, ...Array(MAX_PLAYERS - playerNames.length).fill('')].slice(
    0,
    MAX_PLAYERS
  );
  const [namesInput, setNamesInput] = useState<string[]>(initialNames);
  const [useWolke, setUseWolke] = useState(useAnniversaryRules);
  const [error, setError] = useState<string | null>(null);

  const removeName = (idx: number) => {
    const copy = [...namesInput];
    copy[idx] = '';
    setNamesInput(copy);
  };

  const handleStart = () => {
    const trimmed = namesInput.map((n) => n.trim());
    const firstEmpty = trimmed.findIndex((n) => n === '');
    const afterEmptyFilled =
      firstEmpty !== -1 ? trimmed.slice(firstEmpty + 1).some((n) => n !== '') : false;

    if (afterEmptyFilled) {
      setError(t('configureGame.errors.gapInNames'));
      return;
    }

    const trimmedNames = namesInput.map((n) => n.trim()).filter((n) => n !== '');
    if (trimmedNames.length < 3) {
      setError(t('configureGame.errors.minPlayers'));
      return;
    }
    if (trimmedNames.length > MAX_PLAYERS) {
      setError(t('configureGame.errors.maxPlayers', { max: MAX_PLAYERS }));
      return;
    }
    if (new Set(trimmedNames).size !== trimmedNames.length) {
      setError(t('configureGame.errors.uniqueNames'));
      return;
    }

    setPlayerNames(trimmedNames);
    setUseAnniversaryRules(useWolke);
    onStart(trimmedNames, useWolke);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">{t('configureGame.title')}</h1>
      <div className="space-y-4">
        {namesInput.map((name, i) => (
          <div key={i} className="flex items-center space-x-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const copy = [...namesInput];
                copy[i] = e.target.value;
                setNamesInput(copy);
              }}
              placeholder={t('configureGame.playerNamePlaceholder', { number: i + 1 })}
              className="border p-2 rounded flex-grow"
            />
            {name && (
              <button onClick={() => removeName(i)} className="text-red-500">
                ✕
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useWolke"
            checked={useWolke}
            onChange={(e) => setUseWolke(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="useWolke">{t('configureGame.useAnniversaryRules')}</label>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <button onClick={handleStart} className="bg-blue-500 text-white p-2 rounded w-full">
          {t('configureGame.startGame')}
        </button>
      </div>
    </div>
  );
};

export default ConfigureGame;
