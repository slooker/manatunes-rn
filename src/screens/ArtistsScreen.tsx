import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRepository } from '@hooks/useRepository';
import { useNoServerRedirect } from '@hooks/useNoServerRedirect';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { NoServerScreen } from '@components/NoServerScreen';
import { ArtistRow } from '@components/ArtistRow';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Artist } from '@api/SubsonicTypes';
import { showArtistActions } from '@utils/mediaActions';

export default function ArtistsScreen() {
  const navigation = useNavigation<any>();
  const client = useRepository();
  const { hasNoServers, goToServers } = useNoServerRedirect(navigation);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    client.getArtists().then((result) => {
      setLoading(false);
      if (result.ok) {
        const all = result.data.index?.flatMap((idx) => idx.artist) ?? [];
        setArtists(all);
      } else {
        setError(result.isNetworkError ? 'Network error' : result.message);
      }
    });
  }, [client]);

  if (hasNoServers) return <NoServerScreen onAddServer={goToServers} />;
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={() => setError(null)} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={artists}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <ArtistRow
            artist={item}
            getCoverArtUrl={(id) => client!.getCoverArtUrl(id)}
            onPress={(a) => navigation.navigate('ArtistDetail', { artistId: a.id, artistName: a.name })}
            onLongPress={(a) => client && showArtistActions(a, client)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { paddingBottom: 16 },
});
