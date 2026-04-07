import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { Track } from 'react-native-track-player';
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

      // Sync store
      const track = await TrackPlayer.getActiveTrack();
      usePlaybackStore.getState().setCurrentTrack(track ?? null);
      usePlaybackStore.getState().setQueue(state.tracks);
    } catch (e) {
      // Non-fatal — corrupted state, start fresh
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
