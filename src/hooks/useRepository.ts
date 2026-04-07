import { useEffect, useRef, useState } from 'react';
import { SubsonicClient } from '@api/SubsonicClient';
import { useServerStore } from '@store/useServerStore';

interface RepositoryState {
  client: SubsonicClient | null;
  isLoading: boolean;
  missingCredentials: boolean;
}

/**
 * Returns a SubsonicClient built from the active server config.
 * Returns null if no server is configured.
 */
export function useRepositoryState(): RepositoryState {
  const { getActiveServer, getPassword } = useServerStore();
  const [client, setClient] = useState<SubsonicClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [missingCredentials, setMissingCredentials] = useState(false);
  const activeServer = getActiveServer();
  const serverId = activeServer?.id;

  useEffect(() => {
    let cancelled = false;

    if (!activeServer) {
      setClient(null);
      setIsLoading(false);
      setMissingCredentials(false);
      return;
    }

    setClient(null);
    setIsLoading(true);
    setMissingCredentials(false);

    getPassword(activeServer.id).then((password) => {
      if (cancelled) return;

      if (!password) {
        setClient(null);
        setMissingCredentials(true);
        setIsLoading(false);
        return;
      }

      setClient(
        new SubsonicClient({
          serverUrl: activeServer.url,
          username: activeServer.username,
          password,
        })
      );
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { client, isLoading, missingCredentials };
}

export function useRepository(): SubsonicClient | null {
  return useRepositoryState().client;
}

/**
 * Returns a SubsonicClient as a ref (stable across renders, no re-render on change).
 * Useful inside event handlers and services.
 */
export function useRepositoryRef(): React.MutableRefObject<SubsonicClient | null> {
  const client = useRepository();
  const ref = useRef<SubsonicClient | null>(client);
  ref.current = client;
  return ref;
}
