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

const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set) => ({
      playerNames: ['', '', '', '', '', ''],
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
    }
  )
);

export default useSettingsStore;
