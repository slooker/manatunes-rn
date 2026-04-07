import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FavoriteSong } from './useFavoritesStore';

export interface LocalPlaylist {
  id: string;
  name: string;
  songs: FavoriteSong[];
  createdAt: number;
  updatedAt: number;
}

interface PlaylistStore {
  playlists: LocalPlaylist[];

  createPlaylist(name: string): Promise<LocalPlaylist>;
  updatePlaylistName(id: string, name: string): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
  addSongsToPlaylist(id: string, songs: FavoriteSong[]): Promise<void>;
  removeSongFromPlaylist(playlistId: string, songId: string): Promise<void>;
  reorderPlaylistSongs(playlistId: string, from: number, to: number): Promise<void>;

  loadFromStorage(): Promise<void>;
}

const STORAGE_KEY = 'playlists';

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function persist(playlists: LocalPlaylist[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],

  async createPlaylist(name) {
    const now = Date.now();
    const playlist: LocalPlaylist = {
      id: generateId(),
      name,
      songs: [],
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...get().playlists, playlist];
    await persist(updated);
    set({ playlists: updated });
    return playlist;
  },

  async updatePlaylistName(id, name) {
    const updated = get().playlists.map((p) =>
      p.id === id ? { ...p, name, updatedAt: Date.now() } : p
    );
    await persist(updated);
    set({ playlists: updated });
  },

  async deletePlaylist(id) {
    const updated = get().playlists.filter((p) => p.id !== id);
    await persist(updated);
    set({ playlists: updated });
  },

  async addSongsToPlaylist(id, songs) {
    const updated = get().playlists.map((p) => {
      if (p.id !== id) return p;
      // Deduplicate by song id
      const existingIds = new Set(p.songs.map((s) => s.id));
      const newSongs = songs.filter((s) => !existingIds.has(s.id));
      return { ...p, songs: [...p.songs, ...newSongs], updatedAt: Date.now() };
    });
    await persist(updated);
    set({ playlists: updated });
  },

  async removeSongFromPlaylist(playlistId, songId) {
    const updated = get().playlists.map((p) =>
      p.id === playlistId
        ? { ...p, songs: p.songs.filter((s) => s.id !== songId), updatedAt: Date.now() }
        : p
    );
    await persist(updated);
    set({ playlists: updated });
  },

  async reorderPlaylistSongs(playlistId, from, to) {
    const updated = get().playlists.map((p) => {
      if (p.id !== playlistId) return p;
      const songs = [...p.songs];
      const [moved] = songs.splice(from, 1);
      songs.splice(to, 0, moved);
      return { ...p, songs, updatedAt: Date.now() };
    });
    await persist(updated);
    set({ playlists: updated });
  },

  async loadFromStorage() {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    set({ playlists: json ? JSON.parse(json) : [] });
  },
}));
