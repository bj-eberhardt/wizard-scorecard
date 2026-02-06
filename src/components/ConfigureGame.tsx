import React, { useState, useEffect } from 'react';
import useSettingsStore from '../store/settingsStore';
import { useTranslation } from 'react-i18next';
import { roundsForCount } from '../store/gameStore';
import InfoTooltip from './InfoTooltip';

interface ConfigureGameProps {
  onStart: (names: string[], useWolke: boolean, useNotEqual: boolean, rounds?: number) => void;
}

const ConfigureGame: React.FC<ConfigureGameProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const MAX_PLAYERS = 6;
  const playerNames = useSettingsStore((state) => state.playerNames);
  const setPlayerNames = useSettingsStore((state) => state.setPlayerNames);
  const useAnniversaryRules = useSettingsStore((state) => state.useAnniversaryRules);
  const setUseAnniversaryRules = useSettingsStore((state) => state.setUseAnniversaryRules);
  const useNotEqualSetting = useSettingsStore((state) => state.useNotEqual);
  const setUseNotEqualSetting = useSettingsStore((state) => state.setUseNotEqual);

  const initialNames = [...playerNames, ...Array(MAX_PLAYERS - playerNames.length).fill('')].slice(
    0,
    MAX_PLAYERS
  );
  const [namesInput, setNamesInput] = useState<string[]>(initialNames);
  const [useWolke, setUseWolke] = useState(useAnniversaryRules);
  const [useNotEqual, setUseNotEqual] = useState(useNotEqualSetting);
  const [error, setError] = useState<string | null>(null);

  // rounds state and manual override flag
  const nonEmptyCount = namesInput.map((n) => n.trim()).filter((n) => n !== '').length;
  const defaultRounds = roundsForCount(nonEmptyCount);
  const [rounds, setRounds] = useState<number>(defaultRounds);
  const [manualRounds, setManualRounds] = useState(false);

  // allowed bounds for input: at least 5, at most double the default for current player count
  const minAllowedRounds = 5;
  // make maxAllowedRounds stateful so it updates reliably when player count changes
  const [maxAllowedRounds, setMaxAllowedRounds] = useState<number>(
    defaultRounds > 0 ? defaultRounds * 2 : minAllowedRounds * 2
  );

  useEffect(() => {
    // when player count changes, recompute default and allowed max
    const newDefault = roundsForCount(nonEmptyCount);
    const newMax = newDefault > 0 ? newDefault * 2 : minAllowedRounds * 2;
    setMaxAllowedRounds(newMax);

    // if the user didn't override rounds manually, update rounds to the new default
    if (!manualRounds) {
      setRounds(newDefault);
    }
  }, [nonEmptyCount]);

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

    // validate rounds: at least 5 and at most double the default for this player count
    const defaultForCount = roundsForCount(trimmedNames.length);
    const minRounds = 5;
    const maxRounds = defaultForCount > 0 ? defaultForCount * 2 : minRounds * 2;
    const chosenRounds = Number.isNaN(rounds) ? 0 : rounds;

    if (chosenRounds < minRounds) {
      setError(t('configureGame.errors.roundsTooSmall', { min: minRounds }));
      return;
    }
    if (chosenRounds > maxRounds) {
      setError(t('configureGame.errors.roundsTooLarge', { max: maxRounds }));
      return;
    }

    setPlayerNames(trimmedNames);
    setUseAnniversaryRules(useWolke);
    setUseNotEqualSetting(useNotEqual);
    setError(null);
    // pass rounds if set (>0) otherwise undefined for backward compatibility
    onStart(trimmedNames, useWolke, useNotEqual, rounds && rounds > 0 ? rounds : undefined);
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
              placeholder={t('configureGame.playerNamePlaceholder', { number: i + 1 })}
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
                aria-label={t('configureGame.removePlayerLabel', { number: i + 1 })}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* rounds setting */}
        <label className="flex flex-col items-start gap-1 mt-4 w-full">
          <span className="text-sm">{t('configureGame.roundsLabel')}</span>
          <input
            type="number"
            min={minAllowedRounds}
            max={maxAllowedRounds}
            value={rounds}
            onChange={(e) => {
              const v = parseInt(e.target.value || '0', 10);
              setManualRounds(true);
              setRounds(Number.isNaN(v) ? 0 : v);
            }}
            className="border p-1 w-full"
            aria-label={t('configureGame.roundsLabel')}
          />
          <span className="text-xs text-gray-500">
            {t('configureGame.roundsHelp', { default: defaultRounds })}
          </span>
        </label>

        <div className="relative w-full flex items-center gap-2 mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useWolke}
              onChange={(e) => setUseWolke(e.target.checked)}
            />
            {t('configureGame.useAnniversaryRules')}
          </label>
          <InfoTooltip
            title={t('configureGame.wolkeInfoTitle') as string}
            content={t('configureGame.wolkeInfo') as string}
            className="ml-1"
          />
        </div>

        <div className="relative w-full flex items-center gap-2 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useNotEqual}
              onChange={(e) => setUseNotEqual(e.target.checked)}
            />
            {t('configureGame.useNotEqual')}
          </label>
          <InfoTooltip
            title={t('configureGame.notEqualInfoTitle') as string}
            content={t('configureGame.notEqualInfo') as string}
            className="ml-1"
          />
        </div>

        {error && <div className="bg-red-100 text-red-700 p-2 mb-2 rounded">{error}</div>}
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
