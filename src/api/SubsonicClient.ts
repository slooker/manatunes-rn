import axios, { AxiosInstance } from 'axios';
import { buildAuthParams } from './SubsonicAuth';
import type {
  SubsonicResult,
  SubsonicResponse,
  ArtistsResponse,
  ArtistID3,
  Album,
  Song,
  SearchResult3,
  Starred2Response,
  AlbumList2Response,
  SongsResponse,
  GenresResponse,
  AlbumListType,
  Playlist,
  PlaylistsResponse,
} from './SubsonicTypes';

const CLIENT_NAME = 'ManaTunes';
const API_VERSION = '1.16.1';
const TIMEOUT_MS = 30_000;

export interface SubsonicConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export class SubsonicClient {
  private http: AxiosInstance;
  private config: SubsonicConfig;

  constructor(config: SubsonicConfig) {
    this.config = config;
    const base = config.serverUrl.replace(/\/$/, '');
    this.http = axios.create({
      baseURL: `${base}/rest`,
      timeout: TIMEOUT_MS,
    });
  }

  // ─── Auth helpers ────────────────────────────────────────────────────────────

  private authParams(): Record<string, string> {
    return buildAuthParams(this.config.username, this.config.password, CLIENT_NAME, API_VERSION);
  }

  private async get<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {}
  ): Promise<SubsonicResult<T>> {
    try {
      const cleanParams: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) cleanParams[k] = v;
      }

      const response = await this.http.get<SubsonicResponse<T>>(endpoint, {
        params: { ...this.authParams(), ...cleanParams },
      });

      const body = response.data['subsonic-response'];
      if (body.status !== 'ok') {
        return {
          ok: false,
          isNetworkError: false,
          code: body.error?.code ?? 0,
          message: body.error?.message ?? 'Unknown error',
        };
      }

      return { ok: true, data: body as unknown as T };
    } catch (e: unknown) {
      const err = e as Error & { code?: string };
      const isTimeout = err.code === 'ECONNABORTED';
      return { ok: false, isNetworkError: true, isTimeout, error: err };
    }
  }

  // ─── URL builders (no network call) ─────────────────────────────────────────

  getStreamUrl(id: string, maxBitRate?: number, format?: string, replayGain?: string): string {
    const base = this.config.serverUrl.replace(/\/$/, '');
    const auth = buildAuthParams(this.config.username, this.config.password, CLIENT_NAME, API_VERSION);
    const params = new URLSearchParams({ ...auth, id });
    if (maxBitRate) params.set('maxBitRate', String(maxBitRate));
    if (format) params.set('format', format);
    if (replayGain) params.set('replayGain', replayGain);
    return `${base}/rest/stream?${params}`;
  }

  getCoverArtUrl(id: string, size?: number): string {
    const base = this.config.serverUrl.replace(/\/$/, '');
    const auth = buildAuthParams(this.config.username, this.config.password, CLIENT_NAME, API_VERSION);
    const params = new URLSearchParams({ ...auth, id });
    if (size) params.set('size', String(size));
    return `${base}/rest/getCoverArt?${params}`;
  }

  // ─── API methods ─────────────────────────────────────────────────────────────

  async ping(): Promise<SubsonicResult<boolean>> {
    const result = await this.get('/ping');
    if (result.ok) return { ok: true, data: true };
    return result as SubsonicResult<boolean>;
  }

  async getArtists(): Promise<SubsonicResult<ArtistsResponse>> {
    const result = await this.get<{ artists: ArtistsResponse }>('/getArtists');
    if (!result.ok) return result as SubsonicResult<ArtistsResponse>;
    return { ok: true, data: (result.data as any).artists ?? {} };
  }

  async getArtist(id: string): Promise<SubsonicResult<ArtistID3>> {
    const result = await this.get<{ artist: ArtistID3 }>('/getArtist', { id });
    if (!result.ok) return result as SubsonicResult<ArtistID3>;
    return { ok: true, data: (result.data as any).artist };
  }

  async getAlbum(id: string): Promise<SubsonicResult<Album>> {
    const result = await this.get<{ album: Album }>('/getAlbum', { id });
    if (!result.ok) return result as SubsonicResult<Album>;
    return { ok: true, data: (result.data as any).album };
  }

  async getSong(id: string): Promise<SubsonicResult<Song>> {
    const result = await this.get<{ song: Song }>('/getSong', { id });
    if (!result.ok) return result as SubsonicResult<Song>;
    return { ok: true, data: (result.data as any).song };
  }

  async search3(
    query: string,
    artistCount = 10,
    albumCount = 10,
    songCount = 20
  ): Promise<SubsonicResult<SearchResult3>> {
    const result = await this.get<{ searchResult3: SearchResult3 }>('/search3', {
      query,
      artistCount,
      albumCount,
      songCount,
    });
    if (!result.ok) return result as SubsonicResult<SearchResult3>;
    return { ok: true, data: (result.data as any).searchResult3 ?? {} };
  }

  async getAlbumList2(
    type: AlbumListType,
    size = 20,
    offset = 0
  ): Promise<SubsonicResult<AlbumList2Response>> {
    const result = await this.get<{ albumList2: AlbumList2Response }>('/getAlbumList2', {
      type,
      size,
      offset,
    });
    if (!result.ok) return result as SubsonicResult<AlbumList2Response>;
    return { ok: true, data: (result.data as any).albumList2 ?? {} };
  }

  async getStarred2(): Promise<SubsonicResult<Starred2Response>> {
    const result = await this.get<{ starred2: Starred2Response }>('/getStarred2');
    if (!result.ok) return result as SubsonicResult<Starred2Response>;
    return { ok: true, data: (result.data as any).starred2 ?? {} };
  }

  async star(id?: string, albumId?: string, artistId?: string): Promise<SubsonicResult<void>> {
    const result = await this.get<void>('/star', { id, albumId, artistId });
    if (!result.ok) return result as SubsonicResult<void>;
    return { ok: true, data: undefined };
  }

  async unstar(id?: string, albumId?: string, artistId?: string): Promise<SubsonicResult<void>> {
    const result = await this.get<void>('/unstar', { id, albumId, artistId });
    if (!result.ok) return result as SubsonicResult<void>;
    return { ok: true, data: undefined };
  }

  async getGenres(): Promise<SubsonicResult<GenresResponse>> {
    const result = await this.get<{ genres: GenresResponse }>('/getGenres');
    if (!result.ok) return result as SubsonicResult<GenresResponse>;
    return { ok: true, data: (result.data as any).genres ?? {} };
  }

  async getSongsByGenre(genre: string, count = 50, offset = 0): Promise<SubsonicResult<SongsResponse>> {
    const result = await this.get<{ songsByGenre: SongsResponse }>('/getSongsByGenre', {
      genre,
      count,
      offset,
    });
    if (!result.ok) return result as SubsonicResult<SongsResponse>;
    return { ok: true, data: (result.data as any).songsByGenre ?? {} };
  }

  async getRandomSongs(size = 50, genre?: string): Promise<SubsonicResult<SongsResponse>> {
    const result = await this.get<{ randomSongs: SongsResponse }>('/getRandomSongs', {
      size,
      genre,
    });
    if (!result.ok) return result as SubsonicResult<SongsResponse>;
    return { ok: true, data: (result.data as any).randomSongs ?? {} };
  }

  async getPlaylists(): Promise<SubsonicResult<PlaylistsResponse>> {
    const result = await this.get<{ playlists: PlaylistsResponse }>('/getPlaylists');
    if (!result.ok) return result as SubsonicResult<PlaylistsResponse>;
    return { ok: true, data: (result.data as any).playlists ?? {} };
  }

  async getPlaylist(id: string): Promise<SubsonicResult<Playlist>> {
    const result = await this.get<{ playlist: Playlist }>('/getPlaylist', { id });
    if (!result.ok) return result as SubsonicResult<Playlist>;
    return { ok: true, data: (result.data as any).playlist };
  }
}
