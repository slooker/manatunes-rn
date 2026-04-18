import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { State, Track } from 'react-native-track-player';
import { usePlaybackStore } from '@store/usePlaybackStore';

const STORAGE_KEY = 'queue_state';

interface QueueState {
  tracks: Track[];
  currentIndex: number;
  position: number;
}

export const QueuePersistence = {
  async save(): Promise<void> {
    try {
      const [queue, index, progress] = await Promise.all([
        TrackPlayer.getQueue(),
        TrackPlayer.getActiveTrackIndex(),
        TrackPlayer.getProgress(),
      ]);
      const state: QueueState = {
        tracks: queue,
        currentIndex: index ?? 0,
        position: progress.position,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Non-fatal — silently ignore
    }
  },

  async restore(): Promise<void> {
    try {
      const [existingQueue, playerState] = await Promise.all([
        TrackPlayer.getQueue(),
        TrackPlayer.getPlaybackState(),
      ]);

      // RNTP is active if it has tracks AND is in a state where play() works.
      // Stopped/None means the service was killed (e.g. notification dismissed
      // while paused) — treat that the same as a fresh start.
      const isActive =
        existingQueue.length > 0 &&
        (
          playerState.state === State.Playing ||
          playerState.state === State.Paused ||
          playerState.state === State.Buffering ||
          playerState.state === State.Loading ||
          playerState.state === State.Ready
        );

      if (isActive) {
        // App was backgrounded with RNTP still running — just sync the store.
        // Adding tracks again would duplicate the queue and break playback.
        const track = await TrackPlayer.getActiveTrack();
        usePlaybackStore.getState().setCurrentTrack(track ?? null);
        usePlaybackStore.getState().setQueue(existingQueue);
        usePlaybackStore.getState().setIsPlaying(playerState.state === State.Playing);
        return;
      }

      // Player is idle or stopped — restore from AsyncStorage.
      // Reset first so we're not adding on top of a dead queue.
      if (existingQueue.length > 0) {
        await TrackPlayer.reset();
      }

      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return;
      const state: QueueState = JSON.parse(json);
      if (!state.tracks || state.tracks.length === 0) return;

      await TrackPlayer.add(state.tracks);
      if (state.currentIndex > 0) {
        await TrackPlayer.skip(state.currentIndex);
      }
      if (state.position > 0) {
        await TrackPlayer.seekTo(state.position);
      }

      const track = await TrackPlayer.getActiveTrack();
      usePlaybackStore.getState().setCurrentTrack(track ?? null);
      usePlaybackStore.getState().setQueue(state.tracks);
      usePlaybackStore.getState().setIsPlaying(false);
    } catch (e) {
      // Non-fatal — corrupted state, start fresh
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
