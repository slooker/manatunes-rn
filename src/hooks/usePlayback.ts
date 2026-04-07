import { useEffect } from 'react';
import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import { usePlaybackStore } from '@store/usePlaybackStore';
import { QueuePersistence } from '@services/QueuePersistence';

const EVENTS = [
  Event.PlaybackState,
  Event.PlaybackTrackChanged,
  Event.PlaybackQueueEnded,
  Event.PlaybackProgressUpdated,
];

/**
 * Bridges RNTP events into the Zustand playback store.
 * Must be mounted once near the app root.
 */
export function usePlayback() {
  useTrackPlayerEvents(EVENTS, async (event) => {
    const store = usePlaybackStore.getState();

    if (event.type === Event.PlaybackState) {
      store.setIsPlaying(event.state === State.Playing);
    }

    if (event.type === Event.PlaybackTrackChanged) {
      if (event.nextTrack !== undefined && event.nextTrack !== null) {
        const track = await TrackPlayer.getTrack(event.nextTrack);
        store.setCurrentTrack(track ?? null);
      }
    }

    if (event.type === Event.PlaybackProgressUpdated) {
      store.setPosition(event.position);
      store.setDuration(event.duration);
    }

    if (event.type === Event.PlaybackQueueEnded) {
      store.setIsPlaying(false);
      // Persist the final queue state
      await QueuePersistence.save();
    }
  });

  // Sync queue to store whenever tracks change
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async () => {
      const queue = await TrackPlayer.getQueue();
      usePlaybackStore.getState().setQueue(queue);
      await QueuePersistence.save();
    });
    return () => sub.remove();
  }, []);
}
