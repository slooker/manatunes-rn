/**
 * DownloadService — thin wrapper that initiates album downloads
 * through useDownloadStore. Exists as a named service layer for
 * use from screens without importing the store directly.
 */

import { useDownloadStore } from '@store/useDownloadStore';
import type { Album, Song } from '@api/SubsonicTypes';

export const DownloadService = {
  async downloadAlbum(
    album: Album,
    songs: Song[],
    getStreamUrl: (id: string) => string,
    getCoverArtUrl: (id: string) => string
  ): Promise<void> {
    await useDownloadStore
      .getState()
      .downloadAlbum(album, songs, getStreamUrl, getCoverArtUrl);
  },

  isDownloaded(albumId: string): boolean {
    return useDownloadStore.getState().isAlbumDownloaded(albumId);
  },

  getProgress(albumId: string) {
    return useDownloadStore.getState().activeDownloads[albumId] ?? null;
  },
};
