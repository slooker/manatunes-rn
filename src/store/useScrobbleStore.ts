import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavidromeClient } from '@api/NavidromeClient';

const STORAGE_KEY = 'scrobble_settings';

interface ScrobbleStore {
  listenBrainzLinked: boolean | null; // null = not yet checked
  reportingEnabled: boolean;

  loadFromStorage(): Promise<void>;
  setReportingEnabled(enabled: boolean): Promise<void>;
  checkListenBrainzStatus(client: NavidromeClient): Promise<void>;
  linkListenBrainz(client: NavidromeClient, token: string): Promise<void>;
  unlinkListenBrainz(client: NavidromeClient): Promise<void>;
}

export const useScrobbleStore = create<ScrobbleStore>((set) => ({
  listenBrainzLinked: null,
  reportingEnabled: true,

  async loadFromStorage() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const saved = JSON.parse(json);
      set({ reportingEnabled: saved.reportingEnabled ?? true });
    } catch {
      // Non-fatal — use defaults
    }
  },

  async setReportingEnabled(enabled) {
    set({ reportingEnabled: enabled });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ reportingEnabled: enabled }));
    } catch {
      // Non-fatal
    }
  },

  async checkListenBrainzStatus(client) {
    const linked = await client.getListenBrainzStatus();
    set({ listenBrainzLinked: linked });
  },

  async linkListenBrainz(client, token) {
    await client.linkListenBrainz(token);
    set({ listenBrainzLinked: true });
  },

  async unlinkListenBrainz(client) {
    await client.unlinkListenBrainz();
    set({ listenBrainzLinked: false });
  },
}));
