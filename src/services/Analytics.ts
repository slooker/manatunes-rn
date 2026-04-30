let _analytics: ReturnType<typeof import('@react-native-firebase/analytics').default> | null = null;

function getAnalytics() {
  if (_analytics) return _analytics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _analytics = require('@react-native-firebase/analytics').default();
  } catch {
    // Firebase not available — analytics silently disabled
  }
  return _analytics;
}

function log(event: string, params?: Record<string, unknown>) {
  try {
    getAnalytics()?.logEvent(event, params);
  } catch {
    // Non-fatal
  }
}

export const Analytics = {
  // --- Navigation ---
  screen(name: string) {
    try { getAnalytics()?.logScreenView({ screen_name: name, screen_class: name }); } catch {}
  },

  // --- Browsing ---
  openArtist(artistId: string, artistName: string) {
    log('open_artist', { artist_id: artistId, artist_name: artistName });
  },
  openAlbum(albumId: string, albumName: string, artistName?: string) {
    log('open_album', { album_id: albumId, album_name: albumName, artist_name: artistName ?? '' });
  },
  openPlaylist(playlistId: string, playlistName: string) {
    log('open_playlist', { playlist_id: playlistId, playlist_name: playlistName });
  },

  // --- Search ---
  search(query: string, artistCount: number, albumCount: number, songCount: number) {
    log('search', {
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
    log('play_song', params);
  },
  skipNext() { log('skip_next'); },
  skipPrev() { log('skip_prev'); },
  toggleShuffle(enabled: boolean) { log('toggle_shuffle', { enabled }); },
  toggleRepeat(mode: string) { log('toggle_repeat', { mode }); },

  // --- Playlists ---
  createPlaylist(name: string) { log('create_playlist', { playlist_name: name }); },
  deletePlaylist(name: string) { log('delete_playlist', { playlist_name: name }); },
  addSongsToPlaylist(playlistName: string, count: number) {
    log('add_songs_to_playlist', { playlist_name: playlistName, song_count: count });
  },

  // --- Server management ---
  saveServer(serverName: string, isNew: boolean) {
    log(isNew ? 'add_server' : 'edit_server', { server_name: serverName });
  },
  deleteServer(serverName: string) { log('delete_server', { server_name: serverName }); },
  switchServer(serverName: string) { log('switch_server', { server_name: serverName }); },

  // --- Settings ---
  changeReplayGain(mode: string) { log('change_replay_gain', { mode }); },
};
