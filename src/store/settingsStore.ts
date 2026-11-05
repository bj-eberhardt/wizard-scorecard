import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SupportedLanguage = 'de' | 'en';

/** Type-guard for a value coming from persisted storage (may be absent or corrupt). */
export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return value === 'de' || value === 'en';
}

interface SettingsState {
  playerNames: string[];
  useAnniversaryRules: boolean;
  useNotEqual: boolean;
  // explicit user choice from the footer flag switcher; overrides the browser detector
  language: SupportedLanguage | null;
  setPlayerNames: (names: string[]) => void;
  setUseAnniversaryRules: (use: boolean) => void;
  setUseNotEqual: (use: boolean) => void;
  setLanguage: (language: SupportedLanguage) => void;
}

const DEFAULT_PLAYER_NAMES = ['', '', '', '', '', ''];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePersistedSettings(
  input: unknown
): Pick<SettingsState, 'playerNames' | 'useAnniversaryRules' | 'useNotEqual' | 'language'> {
  const value = isRecord(input) ? input : {};
  const playerNames = value.playerNames;

  return {
    playerNames:
      Array.isArray(playerNames) &&
      playerNames.length <= DEFAULT_PLAYER_NAMES.length &&
      playerNames.every((name) => typeof name === 'string')
        ? playerNames
        : [...DEFAULT_PLAYER_NAMES],
    useAnniversaryRules:
      typeof value.useAnniversaryRules === 'boolean' ? value.useAnniversaryRules : false,
    useNotEqual: typeof value.useNotEqual === 'boolean' ? value.useNotEqual : false,
    language: isSupportedLanguage(value.language) ? value.language : null,
  };
}

const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set) => ({
      playerNames: [...DEFAULT_PLAYER_NAMES],
      useAnniversaryRules: false,
      useNotEqual: false,
      language: null,
      setPlayerNames: (names) => set({ playerNames: names }),
      setUseAnniversaryRules: (use) => set({ useAnniversaryRules: use }),
      setUseNotEqual: (use) => set({ useNotEqual: use }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'wizard_settings_v1',
      version: 2,
      migrate: (persistedState) => normalizePersistedSettings(persistedState) as SettingsState,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedSettings(persistedState),
      }),
    }
  )
);

export default useSettingsStore;
