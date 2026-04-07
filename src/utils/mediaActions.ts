import { Alert } from 'react-native';

import type { Album, Artist, Song } from '@api/SubsonicTypes';
import type { SubsonicClient } from '@api/SubsonicClient';
import { useActionSheetStore } from '@store/useActionSheetStore';
import { useDownloadStore } from '@store/useDownloadStore';
import { useFavoritesStore } from '@store/useFavoritesStore';
import type { FavoriteSong } from '@store/useFavoritesStore';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { usePlaylistStore } from '@store/usePlaylistStore';

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

function choosePlaylist(songs: FavoriteSong[]) {
  const { playlists, addSongsToPlaylist } = usePlaylistStore.getState();
  const { showActionSheet } = useActionSheetStore.getState();

  if (playlists.length === 0) {
    Alert.alert('No playlists', 'Create a playlist first, then try again.');
    return;
  }

  showActionSheet(
    'Add to playlist',
    playlists.map((playlist) => ({
      label: playlist.name,
      onPress: () => addSongsToPlaylist(playlist.id, songs),
    }))
  );
}

export function showSongActions(song: Song, client: SubsonicClient) {
  const favoriteSong = toFavoriteSong(song);
  const { addToQueue, playSong } = usePlaybackStore.getState();
  const { toggleSongFavorite, isSongFavorite } = useFavoritesStore.getState();
  const { showActionSheet } = useActionSheetStore.getState();

  showActionSheet(song.title, [
    {
      label: 'Play now',
      onPress: () => playSong(song, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id)),
    },
    {
      label: 'Add to queue',
      onPress: () => addToQueue(song, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id)),
    },
    { label: 'Add to playlist', onPress: () => choosePlaylist([favoriteSong]) },
    {
      label: isSongFavorite(song.id) ? 'Remove from favorites' : 'Add to favorites',
      onPress: () =>
        toggleSongFavorite(favoriteSong, client).catch(() => {
          Alert.alert('Favorite failed', 'Could not update favorites on your server.');
        }),
    },
  ]);
}

export function showAlbumActions(album: Album, client: SubsonicClient) {
  const { toggleAlbumFavorite, isAlbumFavorite } = useFavoritesStore.getState();
  const { downloadAlbum, isAlbumDownloaded } = useDownloadStore.getState();
  const { addToQueue, playSongs } = usePlaybackStore.getState();
  const { showActionSheet } = useActionSheetStore.getState();

  const loadSongs = async () => {
    const result = await client.getAlbum(album.id);
    return result.ok ? result.data.song ?? [] : [];
  };

  showActionSheet(album.name, [
    {
      label: 'Play now',
      onPress: async () => {
        const songs = await loadSongs();
        if (songs.length > 0) {
          await playSongs(songs, 0, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
        }
      },
    },
    {
      label: 'Add to queue',
      onPress: async () => {
        const songs = await loadSongs();
        for (const song of songs) {
          await addToQueue(song, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
        }
      },
    },
    {
      label: 'Add to playlist',
      onPress: async () => {
        const songs = await loadSongs();
        if (songs.length > 0) choosePlaylist(songs.map(toFavoriteSong));
      },
    },
    {
      label: isAlbumFavorite(album.id) ? 'Remove from favorites' : 'Add to favorites',
      onPress: () =>
        toggleAlbumFavorite({
          id: album.id,
          name: album.name,
          artist: album.artist,
          coverArt: album.coverArt,
        }, client).catch(() => {
          Alert.alert('Favorite failed', 'Could not update favorites on your server.');
        }),
    },
    {
      label: isAlbumDownloaded(album.id) ? 'Downloaded' : 'Download',
      disabled: isAlbumDownloaded(album.id),
      onPress: isAlbumDownloaded(album.id) ? undefined : async () => {
        const songs = await loadSongs();
        if (songs.length > 0) {
          await downloadAlbum(album, songs, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
        }
      },
    },
  ]);
}

export function showArtistActions(artist: Artist, client: SubsonicClient) {
  const { toggleArtistFavorite, isArtistFavorite } = useFavoritesStore.getState();
  const { addToQueue, playSongs } = usePlaybackStore.getState();
  const { showActionSheet } = useActionSheetStore.getState();

  const loadSongs = async () => {
    const result = await client.getArtist(artist.id);
    const albums = result.ok ? result.data.album ?? [] : [];
    const songs: Song[] = [];

    for (const album of albums) {
      const albumResult = await client.getAlbum(album.id);
      if (albumResult.ok) {
        songs.push(...(albumResult.data.song ?? []));
      }
    }

    return songs;
  };

  showActionSheet(artist.name, [
    {
      label: 'Play now',
      onPress: async () => {
        const songs = await loadSongs();
        if (songs.length > 0) {
          await playSongs(songs, 0, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
        }
      },
    },
    {
      label: 'Add to queue',
      onPress: async () => {
        const songs = await loadSongs();
        for (const song of songs) {
          await addToQueue(song, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
        }
      },
    },
    {
      label: 'Add to playlist',
      onPress: async () => {
        const songs = await loadSongs();
        if (songs.length > 0) choosePlaylist(songs.map(toFavoriteSong));
      },
    },
    {
      label: isArtistFavorite(artist.id) ? 'Remove from favorites' : 'Add to favorites',
      onPress: () =>
        toggleArtistFavorite({
          id: artist.id,
          name: artist.name,
          coverArt: artist.coverArt,
        }, client).catch(() => {
          Alert.alert('Favorite failed', 'Could not update favorites on your server.');
        }),
    },
    {
      label: 'Download',
      onPress: async () => {
        const result = await client.getArtist(artist.id);
        const albums = result.ok ? result.data.album ?? [] : [];
        const { downloadAlbum, isAlbumDownloaded } = useDownloadStore.getState();

        for (const album of albums) {
          if (isAlbumDownloaded(album.id)) continue;

          const albumResult = await client.getAlbum(album.id);
          if (albumResult.ok) {
            const songs = albumResult.data.song ?? [];
            if (songs.length > 0) {
              await downloadAlbum(albumResult.data, songs, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
            }
          }
        }
      },
    },
  ]);
}
