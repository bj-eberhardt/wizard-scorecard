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
    setError(null);
    onStart(trimmedNames, useWolke);
  };

  return (
      <div className="mt-8">
        <div className="text-center flex max-w-md mx-auto font-semibold">
          {t('configureGame.title')}
        </div>
        <form className="text-center flex flex-col gap-2 max-w-md mx-auto mt-8">
          {namesInput.map((name, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                    type="text"
                    value={name}
                    placeholder={t('configureGame.playerNamePlaceholder',{number: i+1})}
                    onChange={(e) => {
                      const copy = [...namesInput];
                      copy[i] = e.target.value;
                      setNamesInput(copy);
                    }}
                    className="border p-1 w-full"
                />
                {name && (
                    <button
                        autoFocus={false}
                        type="button"
                        tabIndex={-1}
                        onClick={() => removeName(i)}
                        className="px-2 py-1 text-red-600"
                        aria-label={t('configureGame.removePlayerLabel', {number: i + 1})}
                    >
                      ×
                    </button>
                )}
              </div>
          ))}
          <label className="flex items-center gap-2 mt-4">
            <input
                type="checkbox"
                checked={useWolke}
                onChange={(e) => setUseWolke(e.target.checked)}
            />
            {t('configureGame.useAnniversaryRules')}
          </label>
          {error && <div className="text-red-500">{error}</div>}
          <button
              type={'button'}
              onClick={handleStart}
              className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
          >
            {t('configureGame.startGame')}
          </button>
        </form>
      </div>
  );
};

export default ConfigureGame;
