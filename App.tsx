import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TrackPlayer, { Capability } from 'react-native-track-player';

import { RootNavigator } from '@navigation/RootNavigator';
import { useServerStore } from '@store/useServerStore';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { usePlayback } from '@hooks/usePlayback';
import { useRepository } from '@hooks/useRepository';
import { QueuePersistence } from '@services/QueuePersistence';
import { ActionSheetHost } from '@components/ActionSheetHost';

function AppInner() {
  usePlayback(); // wire RNTP events → playback store

  const client = useRepository();
  const loadFavoritesFromStorage = useFavoritesStore((s) => s.loadFromStorage);
  const syncFavoritesFromServer = useFavoritesStore((s) => s.syncFromServer);

  useEffect(() => {
    loadFavoritesFromStorage().then(() => {
      if (client) {
        syncFavoritesFromServer(client).catch(console.error);
      }
    });
  }, [client, loadFavoritesFromStorage, syncFavoritesFromServer]);

  return (
    <>
      <StatusBar style="light" backgroundColor="#1a1a2e" translucent={false} />
      <RootNavigator />
      <ActionSheetHost />
    </>
  );
}

export default function App() {
  const loadFromStorage = useServerStore((s) => s.loadFromStorage);

  useEffect(() => {
    async function setup() {
      // Load server configs from storage
      await loadFromStorage();

      // Set up TrackPlayer
      await TrackPlayer.setupPlayer({
        minBuffer: 15,
        maxBuffer: 50,
        backBuffer: 30,
        waitForBuffer: true,
        autoHandleInterruptions: true,
      });

      await TrackPlayer.updateOptions({
        progressUpdateEventInterval: 1,
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
      });

      // Restore saved queue from previous session
      await QueuePersistence.restore();
    }

    setup().catch(console.error);
  }, [loadFromStorage]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
