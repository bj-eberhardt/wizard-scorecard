import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  playerNames: string[];
  useAnniversaryRules: boolean;
  setPlayerNames: (names: string[]) => void;
  setUseAnniversaryRules: (use: boolean) => void;
}

const useSettingsStore = create<SettingsState>()(
  persist<SettingsState>(
    (set) => ({
      playerNames: ["", "", "", "", "", ""],
      useAnniversaryRules: false,
      setPlayerNames: (names) => set({ playerNames: names }),
      setUseAnniversaryRules: (use) => set({ useAnniversaryRules: use }),
    }),
    {
      name: "wizard_settings_v1",
    }
  )
);

export default useSettingsStore;
