// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Song {
  id: string;
  title: string;
  album?: string;
  albumId?: string;
  artist?: string;
  artistId?: string;
  track?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  size?: number;
  contentType?: string;
  suffix?: string;
  duration?: number;
  bitRate?: number;
  path?: string;
  starred?: string;
  discNumber?: number;
  type?: string;
}

export interface Album {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  created?: string;
  year?: number;
  genre?: string;
  starred?: string;
  song?: Song[]; // populated on getAlbum
}

export interface Artist {
  id: string;
  name: string;
  albumCount?: number;
  coverArt?: string;
  artistImageUrl?: string;
  starred?: string;
}

export interface ArtistID3 extends Artist {
  album?: Album[]; // populated on getArtist
}

export interface ArtistIndex {
  name: string;
  artist: Artist[];
}

export interface Genre {
  value: string; // serialized as "value" in JSON
  songCount?: number;
  albumCount?: number;
}

export interface Playlist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount?: number;
  duration?: number;
  created?: string;
  changed?: string;
  coverArt?: string;
  entry?: Song[]; // populated on getPlaylist
}

// ─── Response Wrappers ────────────────────────────────────────────────────────

export interface ArtistsResponse {
  ignoredArticles?: string;
  index?: ArtistIndex[];
}

export interface AlbumList2Response {
  album?: Album[];
}

export interface SearchResult3 {
  artist?: Artist[];
  album?: Album[];
  song?: Song[];
}

export interface Starred2Response {
  artist?: Artist[];
  album?: Album[];
  song?: Song[];
}

export interface SongsResponse {
  song?: Song[];
}

export interface GenresResponse {
  genre?: Genre[];
}

export interface PlaylistsResponse {
  playlist?: Playlist[];
}

export interface SubsonicError {
  code: number;
  message: string;
}

export interface SubsonicResponseBody<T> {
  status: string;
  version: string;
  type?: string;
  serverVersion?: string;
  error?: SubsonicError;
  artists?: ArtistsResponse;
  artist?: ArtistID3;
  album?: Album;
  song?: Song;
  searchResult3?: SearchResult3;
  starred2?: Starred2Response;
  albumList2?: AlbumList2Response;
  songs?: SongsResponse;
  randomSongs?: SongsResponse;
  genres?: GenresResponse;
  playlists?: PlaylistsResponse;
  playlist?: Playlist;
}

export interface SubsonicResponse<T> {
  'subsonic-response': SubsonicResponseBody<T>;
}

// ─── Result Type ──────────────────────────────────────────────────────────────

export type SubsonicResult<T> =
  | { ok: true; data: T }
  | { ok: false; isNetworkError: false; code: number; message: string }
  | { ok: false; isNetworkError: true; isTimeout: boolean; error: Error };

// ─── Album List Types ─────────────────────────────────────────────────────────

export type AlbumListType =
  | 'random'
  | 'newest'
  | 'highest'
  | 'frequent'
  | 'recent'
  | 'alphabeticalByName'
  | 'alphabeticalByArtist'
  | 'starred'
  | 'byYear'
  | 'byGenre';
