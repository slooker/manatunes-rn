import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubsonicClient } from '@api/SubsonicClient';
import type { Album, Artist, Song } from '@api/SubsonicTypes';

export interface FavoriteArtist {
  id: string;
  name: string;
  coverArt?: string;
}

export interface FavoriteAlbum {
  id: string;
  name: string;
  artist?: string;
  coverArt?: string;
}

export interface FavoriteSong {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  albumId?: string;
  duration?: number;
  coverArt?: string;
}

interface FavoritesStore {
  artists: FavoriteArtist[];
  albums: FavoriteAlbum[];
  songs: FavoriteSong[];

  isArtistFavorite(id: string): boolean;
  isAlbumFavorite(id: string): boolean;
  isSongFavorite(id: string): boolean;

  toggleArtistFavorite(artist: FavoriteArtist, client?: SubsonicClient): Promise<void>;
  toggleAlbumFavorite(album: FavoriteAlbum, client?: SubsonicClient): Promise<void>;
  toggleSongFavorite(song: FavoriteSong, client?: SubsonicClient): Promise<void>;

  loadFromStorage(): Promise<void>;
  syncFromServer(client: SubsonicClient): Promise<void>;
}

async function save(key: string, data: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

function toFavoriteArtist(artist: Artist): FavoriteArtist {
  return {
    id: artist.id,
    name: artist.name,
    coverArt: artist.coverArt,
  };
}

function toFavoriteAlbum(album: Album): FavoriteAlbum {
  return {
    id: album.id,
    name: album.name,
    artist: album.artist,
    coverArt: album.coverArt,
  };
}

function toFavoriteSong(song: Song): FavoriteSong {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumId: song.albumId,
    duration: song.duration,
    coverArt: song.coverArt,
  };
}

async function saveAll(artists: FavoriteArtist[], albums: FavoriteAlbum[], songs: FavoriteSong[]) {
  await Promise.all([
    save('favorite_artists', artists),
    save('favorite_albums', albums),
    save('favorite_songs', songs),
  ]);
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  artists: [],
  albums: [],
  songs: [],

  isArtistFavorite: (id) => get().artists.some((a) => a.id === id),
  isAlbumFavorite: (id) => get().albums.some((a) => a.id === id),
  isSongFavorite: (id) => get().songs.some((s) => s.id === id),

  async toggleArtistFavorite(artist, client) {
    const { artists } = get();
    const wasFavorite = artists.some((a) => a.id === artist.id);
    const updated = wasFavorite
      ? artists.filter((a) => a.id !== artist.id)
      : [...artists, artist];
    await save('favorite_artists', updated);
    set({ artists: updated });

    if (!client) return;

    const result = wasFavorite
      ? await client.unstar(undefined, undefined, artist.id)
      : await client.star(undefined, undefined, artist.id);

    if (!result.ok) {
      await save('favorite_artists', artists);
      set({ artists });
      throw new Error(result.isNetworkError ? result.error.message : result.message);
    }
  },

  async toggleAlbumFavorite(album, client) {
    const { albums } = get();
    const wasFavorite = albums.some((a) => a.id === album.id);
    const updated = wasFavorite
      ? albums.filter((a) => a.id !== album.id)
      : [...albums, album];
    await save('favorite_albums', updated);
    set({ albums: updated });

    if (!client) return;

    const result = wasFavorite
      ? await client.unstar(undefined, album.id)
      : await client.star(undefined, album.id);

    if (!result.ok) {
      await save('favorite_albums', albums);
      set({ albums });
      throw new Error(result.isNetworkError ? result.error.message : result.message);
    }
  },

  async toggleSongFavorite(song, client) {
    const { songs } = get();
    const wasFavorite = songs.some((s) => s.id === song.id);
    const updated = wasFavorite
      ? songs.filter((s) => s.id !== song.id)
      : [...songs, song];
    await save('favorite_songs', updated);
    set({ songs: updated });

    if (!client) return;

    const result = wasFavorite ? await client.unstar(song.id) : await client.star(song.id);

    if (!result.ok) {
      await save('favorite_songs', songs);
      set({ songs });
      throw new Error(result.isNetworkError ? result.error.message : result.message);
    }
  },

  async loadFromStorage() {
    const [artistsJson, albumsJson, songsJson] = await Promise.all([
      AsyncStorage.getItem('favorite_artists'),
      AsyncStorage.getItem('favorite_albums'),
      AsyncStorage.getItem('favorite_songs'),
    ]);
    set({
      artists: artistsJson ? JSON.parse(artistsJson) : [],
      albums: albumsJson ? JSON.parse(albumsJson) : [],
      songs: songsJson ? JSON.parse(songsJson) : [],
    });
  },

  async syncFromServer(client) {
    const result = await client.getStarred2();
    if (!result.ok) {
      throw new Error(result.isNetworkError ? result.error.message : result.message);
    }

    const artists = (result.data.artist ?? []).map(toFavoriteArtist);
    const albums = (result.data.album ?? []).map(toFavoriteAlbum);
    const songs = (result.data.song ?? []).map(toFavoriteSong);

    await saveAll(artists, albums, songs);
    set({ artists, albums, songs });
  },
}));
