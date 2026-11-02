import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import useSettingsStore from '../store/settingsStore';
import { useTranslation } from 'react-i18next';
import { roundsForCount } from '../store/gameStore';
import InfoTooltip from './InfoTooltip';
import { T } from '../test-ids';

interface ConfigureGameProps {
  onStart: (names: string[], useWolke: boolean, useNotEqual: boolean, rounds?: number) => void;
}

const ConfigureGame: React.FC<ConfigureGameProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const MAX_PLAYERS = 6;
  const MIN_PLAYERS = 3;
  const playerNames = useSettingsStore((state) => state.playerNames);
  const setPlayerNames = useSettingsStore((state) => state.setPlayerNames);
  const useAnniversaryRules = useSettingsStore((state) => state.useAnniversaryRules);
  const setUseAnniversaryRules = useSettingsStore((state) => state.setUseAnniversaryRules);
  const useNotEqualSetting = useSettingsStore((state) => state.useNotEqual);
  const setUseNotEqualSetting = useSettingsStore((state) => state.setUseNotEqual);

  // F9: start with one row per remembered name (min 3, max 6) plus one empty
  // row to type into, instead of six always-visible fields. Rows are kept
  // gap-free by construction: "+" appends, "×" removes and shifts the rest up,
  // so the old gapInNames validation is gone.
  const initialCount = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, playerNames.filter((n) => n.trim() !== '').length)
  );
  const [rows, setRows] = useState<string[]>(() =>
    [...playerNames, ...Array(MAX_PLAYERS).fill('')].slice(0, initialCount).map((n) => n ?? '')
  );
  const [useWolke, setUseWolke] = useState(useAnniversaryRules);
  const [useNotEqual, setUseNotEqual] = useState(useNotEqualSetting);
  const [error, setError] = useState<string | null>(null);
  // localized error text is shown to users; the raw i18n key is exposed as a
  // data-error-key attribute so E2E tests can assert on it without depending on
  // the active language.
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const showError = (key: string, options?: Record<string, unknown>) => {
    setError(t(key, options));
    setErrorKey(key);
  };

  const clearError = () => {
    setError(null);
    setErrorKey(null);
  };

  const nonEmptyCount = rows.map((n) => n.trim()).filter((n) => n !== '').length;
  const defaultRounds = roundsForCount(nonEmptyCount);

  // rounds: segmented control (standard / custom) instead of a bare number input
  const [roundsMode, setRoundsMode] = useState<'standard' | 'custom'>('standard');
  const [manualRounds, setManualRounds] = useState<number>(defaultRounds);
  const [usedManualOverride, setUsedManualOverride] = useState(false);

  // allowed bounds for the manual input: at least 5, at most double the default
  // for the current player count
  const minAllowedRounds = 5;
  const maxAllowedRounds = defaultRounds > 0 ? defaultRounds * 2 : minAllowedRounds * 2;

  useEffect(() => {
    // when the player count changes and the user never typed a manual value,
    // keep the manual field in sync with the new default
    if (!usedManualOverride) {
      setManualRounds(roundsForCount(nonEmptyCount));
    }
  }, [nonEmptyCount, usedManualOverride]);

  const addRow = () => {
    setRows((r) => (r.length < MAX_PLAYERS ? [...r, ''] : r));
  };

  const removeRow = (idx: number) => {
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  const handleStart = () => {
    const trimmed = rows.map((n) => n.trim());
    const trimmedNames = trimmed.filter((n) => n !== '');

    if (trimmedNames.length < MIN_PLAYERS) {
      showError('configureGame.errors.minPlayers');
      return;
    }
    if (trimmedNames.length > MAX_PLAYERS) {
      showError('configureGame.errors.maxPlayers', { max: MAX_PLAYERS });
      return;
    }
    if (new Set(trimmedNames).size !== trimmedNames.length) {
      showError('configureGame.errors.uniqueNames');
      return;
    }

    // validate rounds: at least 5 and at most double the default for this player count
    const defaultForCount = roundsForCount(trimmedNames.length);
    const minRounds = 5;
    const maxRounds = defaultForCount > 0 ? defaultForCount * 2 : minRounds * 2;
    const chosenRounds = roundsMode === 'standard' ? defaultForCount : manualRounds;

    if (chosenRounds < minRounds) {
      showError('configureGame.errors.roundsTooSmall', { min: minRounds });
      return;
    }
    if (chosenRounds > maxRounds) {
      showError('configureGame.errors.roundsTooLarge', { max: maxRounds });
      return;
    }

    setPlayerNames(trimmedNames);
    setUseAnniversaryRules(useWolke);
    setUseNotEqualSetting(useNotEqual);
    clearError();
    onStart(trimmedNames, useWolke, useNotEqual, chosenRounds);
  };

  return (
    <div className="mt-8" data-testid={T.config.root}>
      <form className="flex flex-col gap-4 max-w-md mx-auto mt-8 text-left">
        {/* Players */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-1 text-base font-semibold text-gray-800">
            {t('configureGame.sectionPlayers')}
          </h2>
          <p className="mb-3 text-sm text-gray-500">{t('configureGame.title')}</p>
          {rows.map((name, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <span className="shrink-0 w-16 text-left text-sm text-gray-600">
                {t('configureGame.playerBadge', { number: i + 1, defaultValue: i + 1 })}
              </span>
              <input
                type="text"
                value={name}
                data-testid={T.config.playerName(i)}
                placeholder={t('configureGame.playerNamePlaceholder', { number: i + 1 })}
                onChange={(e) => {
                  const r = [...rows];
                  r[i] = e.target.value;
                  setRows(r);
                }}
                className="min-h-10 w-full border px-2 py-2 text-base"
              />
              {/* at 3 rows no further removal is possible, so hide the × entirely */}
              {rows.length > MIN_PLAYERS && (
                <button
                  autoFocus={false}
                  type="button"
                  tabIndex={-1}
                  onClick={() => removeRow(i)}
                  data-testid={T.config.removePlayer(i)}
                  aria-label={t('configureGame.removePlayerLabel', { number: i + 1 })}
                  className="shrink-0 cursor-pointer p-2 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <X size={18} strokeWidth={2.5} aria-hidden />
                </button>
              )}
            </div>
          ))}

          {rows.length < MAX_PLAYERS && (
            <button
              type="button"
              onClick={addRow}
              data-testid={T.config.addPlayer}
              className="flex cursor-pointer items-center justify-center gap-1 px-3 py-2 min-h-10 rounded border border-dashed border-gray-400 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              {t('configureGame.addPlayer')}
            </button>
          )}
        </section>

        {/* Rounds — only meaningful once at least 3 players are named */}
        {nonEmptyCount >= MIN_PLAYERS && (
          <section className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-base font-semibold text-gray-800">
              {t('configureGame.sectionRounds')}
            </h2>
            <div className="flex flex-col items-start gap-2 w-full">
              <div
                className="flex rounded border border-gray-300 overflow-hidden"
                role="group"
                aria-label={t('configureGame.roundsLabel')}
              >
                <button
                  type="button"
                  onClick={() => setRoundsMode('standard')}
                  data-testid={T.config.roundsModeStandard}
                  data-default-rounds={defaultRounds}
                  aria-pressed={roundsMode === 'standard'}
                  className={`cursor-pointer px-3 py-2 min-h-10 text-base ${
                    roundsMode === 'standard'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t('configureGame.roundsStandard', { default: defaultRounds })}
                </button>
                <button
                  type="button"
                  onClick={() => setRoundsMode('custom')}
                  data-testid={T.config.roundsModeCustom}
                  aria-pressed={roundsMode === 'custom'}
                  className={`cursor-pointer px-3 py-2 min-h-10 text-base ${
                    roundsMode === 'custom'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t('configureGame.roundsCustom')}
                </button>
              </div>
              {roundsMode === 'custom' && (
                <>
                  <input
                    type="number"
                    min={minAllowedRounds}
                    max={maxAllowedRounds}
                    value={manualRounds}
                    data-testid={T.config.rounds}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || '0', 10);
                      setUsedManualOverride(true);
                      setManualRounds(Number.isNaN(v) ? 0 : v);
                    }}
                    className="min-h-10 w-full border px-2 py-2 text-base"
                    aria-label={t('configureGame.roundsCustom')}
                  />
                  <span className="text-xs text-gray-500">
                    {t('configureGame.roundsHelp', { default: defaultRounds })}
                  </span>
                </>
              )}
            </div>
          </section>
        )}

        {/* Options — rule toggles. ONE shared grid so both checkboxes, both
            (wrapping) labels and both info icons line up in three columns: on
            mobile the two blue icons stack under each other, on desktop they sit
            right after the widest label instead of drifting to the far edge. */}
        <section className="rounded-lg border border-gray-200 p-4">
          <h2 className="mb-3 text-base font-semibold text-gray-800">
            {t('configureGame.sectionOptions')}
          </h2>
          <div className="grid w-fit max-w-full grid-cols-[auto_minmax(0,auto)_auto] items-center gap-x-2 gap-y-3 text-left">
            <input
              id="config-anniversary"
              type="checkbox"
              checked={useWolke}
              data-testid={T.config.anniversary}
              onChange={(e) => setUseWolke(e.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer accent-blue-600"
            />
            <label
              htmlFor="config-anniversary"
              className="flex min-h-10 cursor-pointer items-center"
            >
              {t('configureGame.useAnniversaryRules')}
            </label>
            <InfoTooltip
              title={t('configureGame.wolkeInfoTitle') as string}
              content={t('configureGame.wolkeInfo') as string}
              testId={T.config.infoWolke}
            />

            <input
              id="config-not-equal"
              type="checkbox"
              checked={useNotEqual}
              data-testid={T.config.notEqual}
              onChange={(e) => setUseNotEqual(e.target.checked)}
              className="h-5 w-5 shrink-0 cursor-pointer accent-blue-600"
            />
            <label htmlFor="config-not-equal" className="flex min-h-10 cursor-pointer items-center">
              {t('configureGame.useNotEqual')}
            </label>
            <InfoTooltip
              title={t('configureGame.notEqualInfoTitle') as string}
              content={t('configureGame.notEqualInfo') as string}
              testId={T.config.infoNotEqual}
            />
          </div>
        </section>

        {error && (
          <div
            className="bg-red-100 text-red-700 p-2 rounded"
            data-testid={T.config.error}
            data-error-key={errorKey ?? ''}
          >
            {error}
          </div>
        )}
        <button
          type={'button'}
          onClick={handleStart}
          data-testid={T.config.startButton}
          className="min-h-10 w-full cursor-pointer rounded bg-blue-500 px-4 py-2 text-base text-white transition-colors hover:bg-blue-600"
        >
          {t('configureGame.startGame')}
        </button>
      </form>
    </div>
  );
};

export default ConfigureGame;
