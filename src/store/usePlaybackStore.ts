import { create } from 'zustand';
import TrackPlayer, { RepeatMode, Track } from 'react-native-track-player';

import type { Song, Album, Artist } from '@api/SubsonicTypes';
import { useAudioSettingsStore } from '@store/useAudioSettingsStore';

export interface ArtistContext {
  artists: Artist[];
  currentIndex: number;
}

export interface AlbumContext {
  albums: Album[];
  currentIndex: number;
}

interface PlaybackStore {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  position: number;
  duration: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  originalQueue: Track[] | null;
  artistContext: ArtistContext | null;
  albumContext: AlbumContext | null;

  // Setters (called from usePlayback hook)
  setCurrentTrack(track: Track | null): void;
  setQueue(queue: Track[]): void;
  setIsPlaying(playing: boolean): void;
  setPosition(position: number): void;
  setDuration(duration: number): void;

  // Playback actions (call TrackPlayer + update store)
  playSong(song: Song, getStreamUrl: (id: string, replayGain?: string) => string, getCoverArtUrl: (id: string) => string): Promise<void>;
  playSongs(
    songs: Song[],
    startIndex: number,
    getStreamUrl: (id: string, replayGain?: string) => string,
    getCoverArtUrl: (id: string) => string
  ): Promise<void>;
  addToQueue(song: Song, getStreamUrl: (id: string, replayGain?: string) => string, getCoverArtUrl: (id: string) => string): Promise<void>;
  togglePlayPause(): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;
  seekTo(position: number): Promise<void>;
  toggleShuffle(): Promise<void>;
  cycleRepeatMode(): Promise<void>;
  clearQueue(): Promise<void>;
  reorderQueue(from: number, to: number): Promise<void>;
  removeFromQueue(index: number): Promise<void>;
  skipToQueueItem(index: number): Promise<void>;

  // Context tracking (for continuous play across albums/artists)
  setArtistContext(artists: Artist[], currentIndex: number): void;
  setAlbumContext(albums: Album[], currentIndex: number): void;
  clearArtistContext(): void;
  clearAlbumContext(): void;
}

function replayGainParam(): string | undefined {
  const { replayGainMode } = useAudioSettingsStore.getState();
  if (replayGainMode === 'track') return 'trackGain';
  if (replayGainMode === 'album') return 'albumGain';
  return undefined;
}

function songToTrack(
  song: Song,
  getStreamUrl: (id: string, replayGain?: string) => string,
  getCoverArtUrl: (id: string) => string
): Track {
  return {
    id: song.id,
    url: getStreamUrl(song.id, replayGainParam()),
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.coverArt ? getCoverArtUrl(song.coverArt) : undefined,
    duration: song.duration,
    // Store extra metadata for Android Auto context
    description: JSON.stringify({
      songId: song.id,
      albumId: song.albumId,
      artistId: song.artistId,
    }),
  };
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  position: 0,
  duration: 0,
  repeatMode: RepeatMode.Off,
  shuffleEnabled: false,
  originalQueue: null,
  artistContext: null,
  albumContext: null,

  setCurrentTrack: (track) => set({ currentTrack: track }),
  setQueue: (queue) => set({ queue }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),

  async playSong(song, getStreamUrl, getCoverArtUrl) {
    const track = songToTrack(song, getStreamUrl, getCoverArtUrl);
    await TrackPlayer.reset();
    await TrackPlayer.add([track]);
    await TrackPlayer.play();
    set({ currentTrack: track, queue: [track], shuffleEnabled: false, originalQueue: null });
  },

  async playSongs(songs, startIndex, getStreamUrl, getCoverArtUrl) {
    const tracks = songs.map((s) => songToTrack(s, getStreamUrl, getCoverArtUrl));
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    if (startIndex > 0) {
      await TrackPlayer.skip(startIndex);
    }
    await TrackPlayer.play();
    set({ currentTrack: tracks[startIndex] ?? null, queue: tracks, shuffleEnabled: false, originalQueue: null });
  },

  async addToQueue(song, getStreamUrl, getCoverArtUrl) {
    const track = songToTrack(song, getStreamUrl, getCoverArtUrl);
    await TrackPlayer.add([track]);
    set((s) => ({ queue: [...s.queue, track] }));
  },

  async togglePlayPause() {
    const { isPlaying } = get();
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  },

  async skipToNext() {
    const { albumContext, artistContext, repeatMode } = get();

    // Check if we're on the last track
    const currentIndex = await TrackPlayer.getActiveTrackIndex();
    const queue = await TrackPlayer.getQueue();
    const isLastTrack = currentIndex !== undefined && currentIndex >= queue.length - 1;

    if (isLastTrack && repeatMode === RepeatMode.Off) {
      // Try next album in album context
      if (albumContext && albumContext.currentIndex < albumContext.albums.length - 1) {
        set((s) => ({
          albumContext: s.albumContext
            ? { ...s.albumContext, currentIndex: s.albumContext.currentIndex + 1 }
            : null,
        }));
        // Caller (usePlayback hook) handles loading the next album
        return;
      }
      // Try next artist in artist context
      if (artistContext && artistContext.currentIndex < artistContext.artists.length - 1) {
        set((s) => ({
          artistContext: s.artistContext
            ? { ...s.artistContext, currentIndex: s.artistContext.currentIndex + 1 }
            : null,
          albumContext: null,
        }));
        return;
      }
    }

    await TrackPlayer.skipToNext();
  },

  async skipToPrevious() {
    await TrackPlayer.skipToPrevious();
  },

  async seekTo(position) {
    await TrackPlayer.seekTo(position);
  },

  async toggleShuffle() {
    const { shuffleEnabled, originalQueue } = get();
    const currentQueue = await TrackPlayer.getQueue();
    const currentIndex = (await TrackPlayer.getActiveTrackIndex()) ?? 0;

    if (currentQueue.length === 0) {
      set((s) => ({ shuffleEnabled: !s.shuffleEnabled }));
      return;
    }

    if (!shuffleEnabled) {
      // Shuffle everything after the current track, leave history intact
      const upcoming = currentQueue.slice(currentIndex + 1);
      for (let i = upcoming.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
      }
      if (upcoming.length > 0) {
        await TrackPlayer.remove(upcoming.map((_, i) => currentIndex + 1 + i));
        await TrackPlayer.add(upcoming);
      }
      const newQueue = await TrackPlayer.getQueue();
      set({ shuffleEnabled: true, originalQueue: currentQueue, queue: newQueue });
    } else {
      // Restore original upcoming tracks from the saved pre-shuffle queue
      const saved = originalQueue;
      const currentTrack = currentQueue[currentIndex];
      if (saved && currentTrack) {
        const originalIndex = saved.findIndex((t) => t.id === currentTrack.id);
        const restoredUpcoming = originalIndex >= 0 ? saved.slice(originalIndex + 1) : [];
        const upcomingIndices = currentQueue.map((_, i) => i).filter((i) => i > currentIndex);
        if (upcomingIndices.length > 0) await TrackPlayer.remove(upcomingIndices);
        if (restoredUpcoming.length > 0) await TrackPlayer.add(restoredUpcoming);
      }
      const newQueue = await TrackPlayer.getQueue();
      set({ shuffleEnabled: false, originalQueue: null, queue: newQueue });
    }
  },

  async cycleRepeatMode() {
    const { repeatMode } = get();
    const next =
      repeatMode === RepeatMode.Off
        ? RepeatMode.Queue
        : repeatMode === RepeatMode.Queue
        ? RepeatMode.Track
        : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next);
    set({ repeatMode: next });
  },

  async clearQueue() {
    await TrackPlayer.reset();
    set({ currentTrack: null, queue: [], isPlaying: false });
  },

  async reorderQueue(from, to) {
    await TrackPlayer.move(from, to);
    const updated = await TrackPlayer.getQueue();
    set({ queue: updated });
  },

  async removeFromQueue(index) {
    await TrackPlayer.remove(index);
    const updated = await TrackPlayer.getQueue();
    const current = await TrackPlayer.getActiveTrack();
    set({ queue: updated, currentTrack: current ?? null });
  },

  async skipToQueueItem(index) {
    await TrackPlayer.skip(index);
    await TrackPlayer.play();
  },

  setArtistContext: (artists, currentIndex) => set({ artistContext: { artists, currentIndex } }),
  setAlbumContext: (albums, currentIndex) => set({ albumContext: { albums, currentIndex } }),
  clearArtistContext: () => set({ artistContext: null }),
  clearAlbumContext: () => set({ albumContext: null }),
}));
