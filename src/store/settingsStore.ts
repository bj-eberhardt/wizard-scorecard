import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  playerNames: string[];
  useAnniversaryRules: boolean;
  useNotEqual: boolean;
  setPlayerNames: (names: string[]) => void;
  setUseAnniversaryRules: (use: boolean) => void;
  setUseNotEqual: (use: boolean) => void;
}

const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set) => ({
      playerNames: ['', '', '', '', '', ''],
      useAnniversaryRules: false,
      useNotEqual: false,
      setPlayerNames: (names) => set({ playerNames: names }),
      setUseAnniversaryRules: (use) => set({ useAnniversaryRules: use }),
      setUseNotEqual: (use) => set({ useNotEqual: use }),
    }),
    {
      name: 'wizard_settings_v1',
    }
  )
);

export default useSettingsStore;
