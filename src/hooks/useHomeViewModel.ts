import { useState, useCallback } from 'react';
import type { Album } from '@api/SubsonicTypes';
import { useRepositoryState } from './useRepository';
import { useServerStore } from '@store/useServerStore';

export type HomeState =
  | { type: 'Loading' }
  | { type: 'NoServer' }
  | { type: 'Success'; albums: Album[]; title: string }
  | { type: 'Error'; message: string };

export function useHomeViewModel() {
  const [state, setState] = useState<HomeState>({ type: 'Loading' });
  const { client, isLoading: isRepositoryLoading, missingCredentials } = useRepositoryState();
  const activeServer = useServerStore((s) => s.getActiveServer());
  const isServerStoreLoaded = useServerStore((s) => s.isLoaded);

  const load = useCallback(async () => {
    if (!isServerStoreLoaded) {
      setState({ type: 'Loading' });
      return;
    }
    if (!activeServer) {
      setState({ type: 'NoServer' });
      return;
    }
    if (isRepositoryLoading) {
      setState({ type: 'Loading' });
      return;
    }
    if (missingCredentials) {
      setState({ type: 'Error', message: 'Server credentials are missing. Please edit the server and re-enter the password.' });
      return;
    }
    if (!client) {
      setState({ type: 'Loading' });
      return;
    }

    setState({ type: 'Loading' });

    // Try frequently played first
    const frequentResult = await client.getAlbumList2('frequent', 50, 0);
    if (frequentResult.ok) {
      const albums = frequentResult.data.album ?? [];
      if (albums.length > 0) {
        setState({ type: 'Success', albums, title: 'Frequently Played' });
        return;
      }
    } else if (!frequentResult.isNetworkError) {
      setState({ type: 'Error', message: frequentResult.message });
      return;
    } else {
      setState({ type: 'Error', message: 'Network error. Check your connection.' });
      return;
    }

    // Fallback: random albums
    const randomResult = await client.getAlbumList2('random', 50, 0);
    if (randomResult.ok) {
      setState({ type: 'Success', albums: randomResult.data.album ?? [], title: 'Discover' });
    } else if (!randomResult.isNetworkError) {
      setState({ type: 'Error', message: randomResult.message });
    } else {
      setState({ type: 'Error', message: 'Network error. Check your connection.' });
    }
  }, [client, activeServer, isRepositoryLoading, isServerStoreLoaded, missingCredentials]);

  const clearError = useCallback(() => {
    setState({ type: 'Loading' });
  }, []);

  return { state, load, clearError, client };
}
