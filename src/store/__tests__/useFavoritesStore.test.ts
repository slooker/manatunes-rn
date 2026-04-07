import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoritesStore } from '../useFavoritesStore';
import { createArtist, createAlbum, createSong } from '@utils/testFixtures';

// AsyncStorage mock is provided by jest-expo via the mock in package.json
// or by @react-native-async-storage/async-storage/jest/async-storage-mock

beforeEach(async () => {
  await AsyncStorage.clear();
  // Reset store to initial state
  useFavoritesStore.setState({ artists: [], albums: [], songs: [] });
});

describe('useFavoritesStore — artists', () => {
  test('toggleArtistFavorite adds artist when not favorited', async () => {
    const artist = createArtist({ id: 'a1', name: 'Artist 1' });
    await useFavoritesStore.getState().toggleArtistFavorite(artist);
    expect(useFavoritesStore.getState().artists).toHaveLength(1);
    expect(useFavoritesStore.getState().isArtistFavorite('a1')).toBe(true);
  });

  test('toggleArtistFavorite removes artist when already favorited', async () => {
    const artist = createArtist({ id: 'a1' });
    await useFavoritesStore.getState().toggleArtistFavorite(artist);
    await useFavoritesStore.getState().toggleArtistFavorite(artist);
    expect(useFavoritesStore.getState().artists).toHaveLength(0);
    expect(useFavoritesStore.getState().isArtistFavorite('a1')).toBe(false);
  });

  test('toggleArtistFavorite persists to AsyncStorage', async () => {
    const artist = createArtist({ id: 'a1' });
    await useFavoritesStore.getState().toggleArtistFavorite(artist);
    const stored = await AsyncStorage.getItem('favorite_artists');
    expect(JSON.parse(stored!)).toHaveLength(1);
  });
});

describe('useFavoritesStore — albums', () => {
  test('toggleAlbumFavorite adds album when not favorited', async () => {
    const album = createAlbum({ id: 'al1' });
    await useFavoritesStore.getState().toggleAlbumFavorite(album);
    expect(useFavoritesStore.getState().isAlbumFavorite('al1')).toBe(true);
  });

  test('toggleAlbumFavorite removes album when already favorited', async () => {
    const album = createAlbum({ id: 'al1' });
    await useFavoritesStore.getState().toggleAlbumFavorite(album);
    await useFavoritesStore.getState().toggleAlbumFavorite(album);
    expect(useFavoritesStore.getState().isAlbumFavorite('al1')).toBe(false);
  });

  test('toggleAlbumFavorite persists to AsyncStorage', async () => {
    const album = createAlbum({ id: 'al1' });
    await useFavoritesStore.getState().toggleAlbumFavorite(album);
    const stored = await AsyncStorage.getItem('favorite_albums');
    expect(JSON.parse(stored!)).toHaveLength(1);
  });
});

describe('useFavoritesStore — songs', () => {
  test('toggleSongFavorite adds song when not favorited', async () => {
    const song = createSong({ id: 's1' });
    await useFavoritesStore.getState().toggleSongFavorite(song);
    expect(useFavoritesStore.getState().isSongFavorite('s1')).toBe(true);
  });

  test('toggleSongFavorite removes song when already favorited', async () => {
    const song = createSong({ id: 's1' });
    await useFavoritesStore.getState().toggleSongFavorite(song);
    await useFavoritesStore.getState().toggleSongFavorite(song);
    expect(useFavoritesStore.getState().isSongFavorite('s1')).toBe(false);
  });

  test('isSongFavorite returns false for unfavorited song', () => {
    expect(useFavoritesStore.getState().isSongFavorite('nonexistent')).toBe(false);
  });

  test('multiple favorites can coexist', async () => {
    await useFavoritesStore.getState().toggleArtistFavorite(createArtist({ id: 'a1' }));
    await useFavoritesStore.getState().toggleAlbumFavorite(createAlbum({ id: 'al1' }));
    await useFavoritesStore.getState().toggleSongFavorite(createSong({ id: 's1' }));
    const state = useFavoritesStore.getState();
    expect(state.artists).toHaveLength(1);
    expect(state.albums).toHaveLength(1);
    expect(state.songs).toHaveLength(1);
  });
});
