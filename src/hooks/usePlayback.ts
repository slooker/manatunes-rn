import { useEffect, useRef } from 'react';
import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';

import type { SubsonicClient } from '@api/SubsonicClient';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { useScrobbleStore } from '@store/useScrobbleStore';
import { QueuePersistence } from '@services/QueuePersistence';

const EVENTS = [
  Event.PlaybackState,
  Event.PlaybackTrackChanged,
  Event.PlaybackQueueEnded,
  Event.PlaybackProgressUpdated,
];

const SCROBBLE_THRESHOLD_SECONDS = 240;

/**
 * Bridges RNTP events into the Zustand playback store.
 * Must be mounted once near the app root.
 */
export function usePlayback(client: SubsonicClient | null) {
  const scrobbledTrackId = useRef<string | null>(null);

  useTrackPlayerEvents(EVENTS, async (event) => {
    const store = usePlaybackStore.getState();

    if (event.type === Event.PlaybackState) {
      store.setIsPlaying(event.state === State.Playing);
    }

    if (event.type === Event.PlaybackTrackChanged) {
      if (event.nextTrack !== undefined && event.nextTrack !== null) {
        const track = await TrackPlayer.getTrack(event.nextTrack);
        store.setCurrentTrack(track ?? null);

        if (track && useScrobbleStore.getState().reportingEnabled) {
          client?.scrobble(track.id, false).catch(() => {});
        }
      }
    }

    if (event.type === Event.PlaybackProgressUpdated) {
      store.setPosition(event.position);
      store.setDuration(event.duration);

      const track = usePlaybackStore.getState().currentTrack;
      if (
        track &&
        client &&
        useScrobbleStore.getState().reportingEnabled &&
        scrobbledTrackId.current !== track.id &&
        event.position >= Math.min(event.duration * 0.5, SCROBBLE_THRESHOLD_SECONDS)
      ) {
        scrobbledTrackId.current = track.id;
        client.scrobble(track.id, true, Date.now()).catch(() => {});
      }
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
