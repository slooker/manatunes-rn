/**
 * Android Auto content hierarchy for ManaTunes.
 *
 * Mirrors the LibrarySessionCallback in PlaybackService.kt:
 *
 *   ROOT (__ROOT__)
 *   ├── Artists (artists)
 *   │   └── artist_<id>  →  album_<albumId>_artist_<artistId>  →  songs
 *   ├── Albums (albums)
 *   │   └── album_<id>  →  songs
 *   └── Frequently Played (frequent_albums)
 *       └── album_<id>  →  songs
 */

import { SubsonicClient } from '@api/SubsonicClient';
import type { Song } from '@api/SubsonicTypes';
import TrackPlayer from 'react-native-track-player';

// Media IDs
const MEDIA_ID_ROOT = '__ROOT__';
const MEDIA_ID_ARTISTS = 'artists';
const MEDIA_ID_ALBUMS = 'albums';
const MEDIA_ID_FREQUENT = 'frequent_albums';
const PREFIX_ARTIST = 'artist_';
const PREFIX_ALBUM = 'album_';
const PREFIX_ALBUM_IN_ARTIST = 'album_'; // album_<albumId>_artist_<artistId>

export interface BrowseItem {
  mediaId: string;
  title: string;
  subtitle?: string;
  artwork?: string;
  playable: boolean;
  browsable: boolean;
  extras?: Record<string, string>;
}

let _client: SubsonicClient | null = null;

export function setAndroidAutoClient(client: SubsonicClient | null) {
  _client = client;
}

export async function handleGetRoot(): Promise<BrowseItem> {
  return {
    mediaId: MEDIA_ID_ROOT,
    title: 'ManaTunes',
    playable: false,
    browsable: true,
  };
}

export async function handleGetChildren(mediaId: string): Promise<BrowseItem[]> {
  if (!_client) return [];

  // Root level: Artists, Albums, Frequently Played
  if (mediaId === MEDIA_ID_ROOT) {
    return [
      { mediaId: MEDIA_ID_ARTISTS, title: 'Artists', playable: false, browsable: true },
      { mediaId: MEDIA_ID_ALBUMS, title: 'Albums', playable: false, browsable: true },
      { mediaId: MEDIA_ID_FREQUENT, title: 'Frequently Played', playable: false, browsable: true },
    ];
  }

  // All artists list
  if (mediaId === MEDIA_ID_ARTISTS) {
    const result = await _client.getArtists();
    if (!result.ok) return [];
    const artists = result.data.index?.flatMap((idx) => idx.artist) ?? [];
    return artists.map((a) => ({
      mediaId: `${PREFIX_ARTIST}${a.id}`,
      title: a.name,
      artwork: a.coverArt ? _client!.getCoverArtUrl(a.coverArt, 200) : undefined,
      playable: false,
      browsable: true,
    }));
  }

  // All albums (alphabetical)
  if (mediaId === MEDIA_ID_ALBUMS) {
    const result = await _client.getAlbumList2('alphabeticalByName', 500, 0);
    if (!result.ok) return [];
    return (result.data.album ?? []).map((a) => ({
      mediaId: `${PREFIX_ALBUM}${a.id}`,
      title: a.name,
      subtitle: a.artist,
      artwork: a.coverArt ? _client!.getCoverArtUrl(a.coverArt, 200) : undefined,
      playable: false,
      browsable: true,
    }));
  }

  // Frequently played albums
  if (mediaId === MEDIA_ID_FREQUENT) {
    const result = await _client.getAlbumList2('frequent', 50, 0);
    if (!result.ok) return [];
    return (result.data.album ?? []).map((a) => ({
      mediaId: `${PREFIX_ALBUM}${a.id}`,
      title: a.name,
      subtitle: a.artist,
      artwork: a.coverArt ? _client!.getCoverArtUrl(a.coverArt, 200) : undefined,
      playable: false,
      browsable: true,
    }));
  }

  // Artist detail: list albums for this artist
  if (mediaId.startsWith(PREFIX_ARTIST)) {
    const artistId = mediaId.slice(PREFIX_ARTIST.length);
    const result = await _client.getArtist(artistId);
    if (!result.ok) return [];
    return (result.data.album ?? []).map((a) => ({
      mediaId: `${PREFIX_ALBUM}${a.id}_artist_${artistId}`,
      title: a.name,
      subtitle: result.data.name,
      artwork: a.coverArt ? _client!.getCoverArtUrl(a.coverArt, 200) : undefined,
      playable: false,
      browsable: true,
    }));
  }

  // Album detail: list playable songs
  // mediaId is either "album_<id>" or "album_<id>_artist_<artistId>"
  const albumMatch = mediaId.match(/^album_([^_]+)/);
  if (albumMatch) {
    const albumId = albumMatch[1];
    const result = await _client.getAlbum(albumId);
    if (!result.ok) return [];
    return (result.data.song ?? []).map((song, idx) => ({
      mediaId: `song:${song.id}:album:${albumId}:index:${idx}`,
      title: song.title,
      subtitle: song.artist,
      artwork: song.coverArt ? _client!.getCoverArtUrl(song.coverArt, 200) : undefined,
      playable: true,
      browsable: false,
      extras: {
        song_id: song.id,
        album_id: albumId,
        artist_id: song.artistId ?? '',
        stream_url: _client!.getStreamUrl(song.id),
      },
    }));
  }

  return [];
}

export async function handleSearch(query: string): Promise<BrowseItem[]> {
  if (!_client) return [];
  const result = await _client.search3(query, 5, 5, 10);
  if (!result.ok) return [];

  const items: BrowseItem[] = [];

  // Add playable songs first (most useful in Auto)
  for (const song of result.data.song ?? []) {
    items.push({
      mediaId: `song:${song.id}:album:${song.albumId ?? ''}:index:0`,
      title: song.title,
      subtitle: song.artist,
      artwork: song.coverArt ? _client.getCoverArtUrl(song.coverArt, 200) : undefined,
      playable: true,
      browsable: false,
      extras: { song_id: song.id, stream_url: _client.getStreamUrl(song.id) },
    });
  }

  // Add browsable artists
  for (const artist of result.data.artist ?? []) {
    items.push({
      mediaId: `${PREFIX_ARTIST}${artist.id}`,
      title: artist.name,
      playable: false,
      browsable: true,
    });
  }

  // Add browsable albums
  for (const album of result.data.album ?? []) {
    items.push({
      mediaId: `${PREFIX_ALBUM}${album.id}`,
      title: album.name,
      subtitle: album.artist,
      artwork: album.coverArt ? _client.getCoverArtUrl(album.coverArt, 200) : undefined,
      playable: false,
      browsable: true,
    });
  }

  return items;
}

/**
 * Play a song by mediaId. Called when the user taps a playable item in Auto.
 */
export async function playMediaItem(mediaId: string, extras?: Record<string, string>): Promise<void> {
  if (!_client || !extras?.stream_url) return;

  const songId = extras.song_id;
  const songResult = await _client.getSong(songId);
  if (!songResult.ok) return;

  const song = songResult.data;
  const track = {
    id: song.id,
    url: extras.stream_url,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.coverArt ? _client.getCoverArtUrl(song.coverArt) : undefined,
    duration: song.duration,
  };

  await TrackPlayer.reset();
  await TrackPlayer.add([track]);
  await TrackPlayer.play();
}
