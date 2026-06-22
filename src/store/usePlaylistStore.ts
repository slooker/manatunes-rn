import { create } from 'zustand';
import type { SubsonicClient } from '@api/SubsonicClient';
import type { Playlist } from '@api/SubsonicTypes';
import { Analytics } from '@services/Analytics';

interface PlaylistStore {
  playlists: Playlist[];

  syncFromServer(client: SubsonicClient): Promise<void>;
  createPlaylist(client: SubsonicClient, name: string): Promise<Playlist>;
  renamePlaylist(client: SubsonicClient, id: string, name: string): Promise<void>;
  deletePlaylist(client: SubsonicClient, id: string): Promise<void>;
  addSongsToPlaylist(client: SubsonicClient, id: string, songIds: string[]): Promise<void>;
  removeSongFromPlaylist(client: SubsonicClient, id: string, songIndex: number): Promise<void>;
  reorderPlaylistSongs(client: SubsonicClient, id: string, songIds: string[]): Promise<void>;
}

function errorMessage(result: { isNetworkError: boolean; message?: string; error?: Error }): string {
  return result.isNetworkError ? result.error?.message ?? 'Network error' : result.message ?? 'Unknown error';
}

async function refreshPlaylistSummary(
  client: SubsonicClient,
  id: string,
  set: (fn: (state: PlaylistStore) => Partial<PlaylistStore>) => void
) {
  const result = await client.getPlaylist(id);
  if (!result.ok) return;
  const { entry, ...summary } = result.data;
  set((state) => ({
    playlists: state.playlists.map((p) => (p.id === id ? { ...p, ...summary } : p)),
  }));
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],

  async syncFromServer(client) {
    const result = await client.getPlaylists();
    if (!result.ok) throw new Error(errorMessage(result));
    set({ playlists: result.data.playlist ?? [] });
  },

  async createPlaylist(client, name) {
    const result = await client.createPlaylist(name);
    if (!result.ok) throw new Error(errorMessage(result));
    set((state) => ({ playlists: [...state.playlists, result.data] }));
    Analytics.createPlaylist(name);
    return result.data;
  },

  async renamePlaylist(client, id, name) {
    const result = await client.updatePlaylist(id, { name });
    if (!result.ok) throw new Error(errorMessage(result));
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  },

  async deletePlaylist(client, id) {
    const deleted = get().playlists.find((p) => p.id === id);
    const result = await client.deletePlaylist(id);
    if (!result.ok) throw new Error(errorMessage(result));
    set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }));
    if (deleted) Analytics.deletePlaylist(deleted.name);
  },

  async addSongsToPlaylist(client, id, songIds) {
    const playlist = get().playlists.find((p) => p.id === id);
    const result = await client.updatePlaylist(id, { songIdToAdd: songIds });
    if (!result.ok) throw new Error(errorMessage(result));
    await refreshPlaylistSummary(client, id, set);
    if (playlist) Analytics.addSongsToPlaylist(playlist.name, songIds.length);
  },

  async removeSongFromPlaylist(client, id, songIndex) {
    const result = await client.updatePlaylist(id, { songIndexToRemove: [songIndex] });
    if (!result.ok) throw new Error(errorMessage(result));
    await refreshPlaylistSummary(client, id, set);
  },

  async reorderPlaylistSongs(client, id, songIds) {
    const result = await client.replacePlaylistSongs(id, songIds);
    if (!result.ok) throw new Error(errorMessage(result));
  },
}));
