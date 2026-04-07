import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRepository } from '@hooks/useRepository';
import { useNoServerRedirect } from '@hooks/useNoServerRedirect';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { NoServerScreen } from '@components/NoServerScreen';
import { AlbumCard } from '@components/AlbumCard';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Album } from '@api/SubsonicTypes';
import { showAlbumActions } from '@utils/mediaActions';

export default function AlbumsScreen() {
  const navigation = useNavigation<any>();
  const client = useRepository();
  const { hasNoServers, goToServers } = useNoServerRedirect(navigation);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    client.getAlbumList2('alphabeticalByName', 500, 0).then((result) => {
      setLoading(false);
      if (result.ok) {
        setAlbums(result.data.album ?? []);
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
        data={albums}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AlbumCard
            album={item}
            getCoverArtUrl={(id) => client!.getCoverArtUrl(id)}
            onPress={(a) =>
              navigation.navigate('AlbumDetail', {
                albumId: a.id,
                albumName: a.name,
                artistName: a.artist,
              })
            }
            onLongPress={(a) => client && showAlbumActions(a, client)}
            size={160}
          />
        )}
      />
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  row: { justifyContent: 'space-around', marginBottom: 12 },
});
