import analytics from '@react-native-firebase/analytics';

export const Analytics = {
  // --- Navigation ---
  screen(name: string) {
    analytics().logScreenView({ screen_name: name, screen_class: name });
  },

  // --- Browsing ---
  openArtist(artistId: string, artistName: string) {
    analytics().logEvent('open_artist', { artist_id: artistId, artist_name: artistName });
  },
  openAlbum(albumId: string, albumName: string, artistName?: string) {
    analytics().logEvent('open_album', { album_id: albumId, album_name: albumName, artist_name: artistName ?? '' });
  },
  openPlaylist(playlistId: string, playlistName: string) {
    analytics().logEvent('open_playlist', { playlist_id: playlistId, playlist_name: playlistName });
  },

  // --- Search ---
  search(query: string, artistCount: number, albumCount: number, songCount: number) {
    analytics().logEvent('search', {
      search_term: query,
      result_count: artistCount + albumCount + songCount,
      artist_count: artistCount,
      album_count: albumCount,
      song_count: songCount,
    });
  },

  // --- Playback ---
  playSong(params: {
    songId: string;
    songTitle: string;
    artistName: string;
    albumName: string;
    source: 'browse' | 'queue' | 'search' | 'android_auto' | 'playlist' | 'favorites';
  }) {
    analytics().logEvent('play_song', params);
  },
  skipNext() { analytics().logEvent('skip_next'); },
  skipPrev() { analytics().logEvent('skip_prev'); },
  toggleShuffle(enabled: boolean) { analytics().logEvent('toggle_shuffle', { enabled }); },
  toggleRepeat(mode: string) { analytics().logEvent('toggle_repeat', { mode }); },

  // --- Playlists ---
  createPlaylist(name: string) {
    analytics().logEvent('create_playlist', { playlist_name: name });
  },
  deletePlaylist(name: string) {
    analytics().logEvent('delete_playlist', { playlist_name: name });
  },
  addSongsToPlaylist(playlistName: string, count: number) {
    analytics().logEvent('add_songs_to_playlist', { playlist_name: playlistName, song_count: count });
  },

  // --- Server management ---
  saveServer(serverName: string, isNew: boolean) {
    analytics().logEvent(isNew ? 'add_server' : 'edit_server', { server_name: serverName });
  },
  deleteServer(serverName: string) {
    analytics().logEvent('delete_server', { server_name: serverName });
  },
  switchServer(serverName: string) {
    analytics().logEvent('switch_server', { server_name: serverName });
  },

  // --- Settings ---
  changeReplayGain(mode: string) {
    analytics().logEvent('change_replay_gain', { mode });
  },
};
