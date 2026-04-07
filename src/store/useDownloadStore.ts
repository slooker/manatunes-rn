import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import type { Album, Song } from '@api/SubsonicTypes';
import { syncAndroidAutoDownloads } from '@services/AndroidAutoConfig';

export interface DownloadedSong {
  id: string;
  title: string;
  artist?: string;
  track?: number;
  duration?: number;
  localPath: string;
}

export interface DownloadedAlbum {
  id: string;
  name: string;
  artist?: string;
  coverArtPath?: string;
  songs: DownloadedSong[];
  downloadedAt: number;
}

export interface DownloadProgress {
  albumId: string;
  current: number;
  total: number;
  songTitle: string;
}

interface DownloadStore {
  albums: DownloadedAlbum[];
  activeDownloads: Record<string, DownloadProgress>;

  isAlbumDownloaded(id: string): boolean;
  getDownloadedAlbum(id: string): DownloadedAlbum | undefined;

  downloadAlbum(
    album: Album,
    songs: Song[],
    getStreamUrl: (id: string) => string,
    getCoverArtUrl: (id: string) => string
  ): Promise<void>;

  deleteDownload(albumId: string): Promise<void>;
  loadFromStorage(): Promise<void>;
}

const STORAGE_KEY = 'downloaded_albums';
const MUSIC_DIR = () => FileSystem.documentDirectory + 'music/';
const COVER_DIR = () => FileSystem.documentDirectory + 'coverart/';

async function ensureDirs() {
  await FileSystem.makeDirectoryAsync(MUSIC_DIR(), { intermediates: true });
  await FileSystem.makeDirectoryAsync(COVER_DIR(), { intermediates: true });
}

async function persist(albums: DownloadedAlbum[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
  syncAndroidAutoDownloads(albums);
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  albums: [],
  activeDownloads: {},

  isAlbumDownloaded: (id) => get().albums.some((a) => a.id === id),
  getDownloadedAlbum: (id) => get().albums.find((a) => a.id === id),

  async downloadAlbum(album, songs, getStreamUrl, getCoverArtUrl) {
    await ensureDirs();

    const albumDir = `${MUSIC_DIR()}${album.id}/`;
    await FileSystem.makeDirectoryAsync(albumDir, { intermediates: true });

    // Download cover art
    let coverArtPath: string | undefined;
    if (album.coverArt) {
      try {
        const coverPath = `${COVER_DIR()}${album.id}.jpg`;
        await FileSystem.downloadAsync(getCoverArtUrl(album.coverArt), coverPath);
        coverArtPath = coverPath;
      } catch {
        // non-fatal
      }
    }

    const downloadedSongs: DownloadedSong[] = [];

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];

      set((s) => ({
        activeDownloads: {
          ...s.activeDownloads,
          [album.id]: { albumId: album.id, current: i + 1, total: songs.length, songTitle: song.title },
        },
      }));

      try {
        const localPath = `${albumDir}${song.id}.mp3`;
        const dl = FileSystem.createDownloadResumable(getStreamUrl(song.id), localPath);
        await dl.downloadAsync();

        downloadedSongs.push({
          id: song.id,
          title: song.title,
          artist: song.artist,
          track: song.track,
          duration: song.duration,
          localPath,
        });
      } catch {
        // Skip failed songs
      }
    }

    // Remove from active downloads
    set((s) => {
      const { [album.id]: _, ...rest } = s.activeDownloads;
      return { activeDownloads: rest };
    });

    if (downloadedSongs.length === 0) return;

    const downloadedAlbum: DownloadedAlbum = {
      id: album.id,
      name: album.name,
      artist: album.artist,
      coverArtPath,
      songs: downloadedSongs,
      downloadedAt: Date.now(),
    };

    const current = get().albums.filter((a) => a.id !== album.id);
    const updated = [...current, downloadedAlbum];
    await persist(updated);
    set({ albums: updated });
  },

  async deleteDownload(albumId) {
    const albumDir = `${MUSIC_DIR()}${albumId}/`;
    try {
      await FileSystem.deleteAsync(albumDir, { idempotent: true });
    } catch {}

    const updated = get().albums.filter((a) => a.id !== albumId);
    await persist(updated);
    set({ albums: updated });
  },

  async loadFromStorage() {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    const albums = json ? JSON.parse(json) : [];
    syncAndroidAutoDownloads(albums);
    set({ albums });
  },
}));
