import type { Song, Album, Artist } from '@api/SubsonicTypes';

export function createArtist(overrides?: Partial<Artist>): Artist {
  return {
    id: 'artist-1',
    name: 'Test Artist',
    albumCount: 3,
    ...overrides,
  };
}

export function createAlbum(overrides?: Partial<Album>): Album {
  return {
    id: 'album-1',
    name: 'Test Album',
    artist: 'Test Artist',
    artistId: 'artist-1',
    songCount: 10,
    year: 2024,
    ...overrides,
  };
}

export function createSong(overrides?: Partial<Song>): Song {
  return {
    id: 'song-1',
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    albumId: 'album-1',
    artistId: 'artist-1',
    duration: 180,
    track: 1,
    ...overrides,
  };
}

export function createArtistList(count = 3): Artist[] {
  return Array.from({ length: count }, (_, i) =>
    createArtist({ id: `artist-${i + 1}`, name: `Artist ${i + 1}` })
  );
}

export function createAlbumList(count = 3): Album[] {
  return Array.from({ length: count }, (_, i) =>
    createAlbum({ id: `album-${i + 1}`, name: `Album ${i + 1}` })
  );
}

export function createSongList(count = 3): Song[] {
  return Array.from({ length: count }, (_, i) =>
    createSong({ id: `song-${i + 1}`, title: `Song ${i + 1}`, track: i + 1 })
  );
}
