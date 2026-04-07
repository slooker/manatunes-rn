import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRepository } from '@hooks/useRepository';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { AlbumCard } from '@components/AlbumCard';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Album, ArtistID3 } from '@api/SubsonicTypes';
import type { RootStackParamList } from '@navigation/types';
import { showAlbumActions } from '@utils/mediaActions';

type Route = RouteProp<RootStackParamList, 'ArtistDetail'>;

export default function ArtistDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { artistId, artistName } = route.params;
  const client = useRepository();
  const [artist, setArtist] = useState<ArtistID3 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: artistName });
    if (!client) return;
    setLoading(true);
    client.getArtist(artistId).then((result) => {
      setLoading(false);
      if (result.ok) {
        setArtist(result.data);
      } else {
        setError(result.isNetworkError ? 'Network error' : result.message);
      }
    });
  }, [client, artistId]);

  if (loading) return <LoadingScreen />;
  if (error || !artist) return <ErrorScreen message={error ?? 'Artist not found'} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={artist.album ?? []}
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
                artistName: artist.name,
              })
            }
            onLongPress={(a) => client && showAlbumActions(a, client)}
            size={160}
          />
        )}
      />
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  row: { justifyContent: 'space-around', marginBottom: 12 },
});
