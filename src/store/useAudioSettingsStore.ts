import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAndroidAutoReplayGain } from '@services/AndroidAutoConfig';
import { Analytics } from '@services/Analytics';

export type ReplayGainMode = 'off' | 'track' | 'album';

const STORAGE_KEY = 'audio_settings';

interface AudioSettingsStore {
  replayGainMode: ReplayGainMode;
  loadFromStorage(): Promise<void>;
  setReplayGainMode(mode: ReplayGainMode): Promise<void>;
}

export const useAudioSettingsStore = create<AudioSettingsStore>((set) => ({
  replayGainMode: 'off',

  async loadFromStorage() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const saved = JSON.parse(json);
      const mode: ReplayGainMode = saved.replayGainMode ?? 'off';
      set({ replayGainMode: mode });
      syncAndroidAutoReplayGain(mode);
    } catch {
      // Non-fatal — use defaults
    }
  },

  async setReplayGainMode(mode) {
    set({ replayGainMode: mode });
    syncAndroidAutoReplayGain(mode);
    Analytics.changeReplayGain(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ replayGainMode: mode }));
    } catch {
      // Non-fatal
    }
  },
}));
