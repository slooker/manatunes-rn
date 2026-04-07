import { useState, useCallback, useRef } from 'react';
import type { Artist, Album, Song } from '@api/SubsonicTypes';
import { useRepository } from './useRepository';

export type SearchState =
  | { type: 'Idle' }
  | { type: 'Loading' }
  | { type: 'Results'; artists: Artist[]; albums: Album[]; songs: Song[] }
  | { type: 'Error'; message: string };

export function useSearchViewModel() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ type: 'Idle' });
  const client = useRepository();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateQuery = useCallback(
    (text: string) => {
      setQuery(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!text.trim()) {
        setState({ type: 'Idle' });
        return;
      }

      setState({ type: 'Loading' });

      debounceRef.current = setTimeout(async () => {
        if (!client) {
          setState({ type: 'Error', message: 'No server configured.' });
          return;
        }

        const result = await client.search3(text.trim(), 10, 10, 20);
        if (result.ok) {
          setState({
            type: 'Results',
            artists: result.data.artist ?? [],
            albums: result.data.album ?? [],
            songs: result.data.song ?? [],
          });
        } else if (!result.isNetworkError) {
          setState({ type: 'Error', message: result.message });
        } else {
          setState({ type: 'Error', message: 'Network error. Check your connection.' });
        }
      }, 300);
    },
    [client]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setState({ type: 'Idle' });
  }, []);

  return { query, state, updateQuery, clearSearch, client };
}
