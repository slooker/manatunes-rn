import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SubsonicClient } from '@api/SubsonicClient';
import { syncAndroidAutoServer } from '@services/AndroidAutoConfig';
import { Analytics } from '@services/Analytics';

const STORAGE_KEY_CONFIGS = 'server_configs';
const STORAGE_KEY_ACTIVE = 'active_server_id';

export interface ServerConfig {
  id: string;
  name: string;
  url: string;
  username: string;
}

interface ServerStore {
  servers: ServerConfig[];
  activeServerId: string | null;
  isLoaded: boolean;

  // Derived
  getActiveServer(): ServerConfig | undefined;
  getClient(): SubsonicClient | null;

  // Mutations
  loadFromStorage(): Promise<void>;
  saveServer(config: Omit<ServerConfig, 'id'> & { id?: string }, password: string): Promise<void>;
  deleteServer(id: string): Promise<void>;
  setActiveServer(id: string): Promise<void>;
  getPassword(id: string): Promise<string | null>;
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function passwordKey(id: string): string {
  return `password_${id}`;
}

export const useServerStore = create<ServerStore>((set, get) => ({
  servers: [],
  activeServerId: null,
  isLoaded: false,

  getActiveServer() {
    const { servers, activeServerId } = get();
    return servers.find((s) => s.id === activeServerId);
  },

  getClient() {
    // Note: This creates a new client on each call. Callers should memoize.
    // Passwords are fetched async via getPassword(); use useRepository hook instead.
    return null;
  },

  async loadFromStorage() {
    try {
      const [configsJson, activeId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_CONFIGS),
        AsyncStorage.getItem(STORAGE_KEY_ACTIVE),
      ]);
      const servers: ServerConfig[] = configsJson ? JSON.parse(configsJson) : [];
      set({ servers, activeServerId: activeId, isLoaded: true });
      const activeServer = servers.find((s) => s.id === activeId);
      const password = activeServer ? await SecureStore.getItemAsync(passwordKey(activeServer.id)) : null;
      syncAndroidAutoServer(activeServer ?? null, password);
    } catch (e) {
      set({ isLoaded: true });
    }
  },

  async saveServer(configInput, password) {
    const { servers } = get();
    const id = configInput.id ?? generateId();
    const config: ServerConfig = {
      id,
      name: configInput.name,
      url: configInput.url.replace(/\/$/, ''),
      username: configInput.username,
    };

    const existing = servers.findIndex((s) => s.id === id);
    const updated = existing >= 0 ? servers.map((s) => (s.id === id ? config : s)) : [...servers, config];

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(updated)),
      SecureStore.setItemAsync(passwordKey(id), password),
    ]);

    const newActive = get().activeServerId ?? id;
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE, newActive);
    set({ servers: updated, activeServerId: newActive });
    Analytics.saveServer(config.name, existing < 0);
    if (newActive === id) {
      syncAndroidAutoServer(config, password);
    }
  },

  async deleteServer(id) {
    const { servers, activeServerId } = get();
    const updated = servers.filter((s) => s.id !== id);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(updated)),
      SecureStore.deleteItemAsync(passwordKey(id)),
    ]);

    let newActive = activeServerId;
    if (activeServerId === id) {
      newActive = updated[0]?.id ?? null;
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE, newActive ?? '');
    }

    const deletedServer = servers.find((s) => s.id === id);
    if (deletedServer) Analytics.deleteServer(deletedServer.name);
    set({ servers: updated, activeServerId: newActive });
    const activeServer = updated.find((s) => s.id === newActive);
    const password = activeServer ? await SecureStore.getItemAsync(passwordKey(activeServer.id)) : null;
    syncAndroidAutoServer(activeServer ?? null, password);
  },

  async setActiveServer(id) {
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE, id);
    set({ activeServerId: id });
    const activeServer = get().servers.find((s) => s.id === id);
    if (activeServer) Analytics.switchServer(activeServer.name);
    const password = activeServer ? await SecureStore.getItemAsync(passwordKey(activeServer.id)) : null;
    syncAndroidAutoServer(activeServer ?? null, password);
  },

  async getPassword(id) {
    return SecureStore.getItemAsync(passwordKey(id));
  },
}));
