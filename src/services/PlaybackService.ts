/**
 * RNTP Headless Task Service Handler.
 *
 * Registered via TrackPlayer.registerPlaybackService() in index.js.
 * Runs in a background context (not inside React component tree).
 *
 * Handles:
 *  - Remote transport controls (lock screen, notification, headphones)
 *  - Android Auto browse/search callbacks
 *  - Queue-end context-aware progression
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import {
  handleGetRoot,
  handleGetChildren,
  handleSearch,
  playMediaItem,
} from './AndroidAutoService';

export async function PlaybackService() {
  // ─── Remote transport controls ─────────────────────────────────────────────

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // End of queue — no next track
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      await TrackPlayer.seekTo(0);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      await TrackPlayer.pause();
    } else if (event.paused) {
      await TrackPlayer.setVolume(0.5);
    } else {
      await TrackPlayer.setVolume(1.0);
    }
  });

  // ─── Android Auto: Browse ──────────────────────────────────────────────────

  // @ts-ignore — RNTP v4 Android Auto events not yet in type defs
  TrackPlayer.addEventListener('remote-browse-tree-root', async (event: { result: Function }) => {
    const root = await handleGetRoot();
    event.result(root);
  });

  // @ts-ignore
  TrackPlayer.addEventListener('remote-browse-tree-children', async (event: { mediaId: string; result: Function }) => {
    const children = await handleGetChildren(event.mediaId);
    event.result(children);
  });

  // ─── Android Auto: Search ──────────────────────────────────────────────────

  // @ts-ignore
  TrackPlayer.addEventListener('remote-play-search', async (event: { query: string; result: Function }) => {
    const results = await handleSearch(event.query);
    event.result(results);
  });

  // ─── Android Auto: Play selected item ─────────────────────────────────────

  // @ts-ignore
  TrackPlayer.addEventListener('remote-play-id', async (event: { id: string; extras?: Record<string, string> }) => {
    await playMediaItem(event.id, event.extras);
  });

  // ─── Queue ended ──────────────────────────────────────────────────────────

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    // Queue ended — the UI hook (usePlayback) handles context-aware next album/artist
    // Nothing to do here in the headless context
  });
}
