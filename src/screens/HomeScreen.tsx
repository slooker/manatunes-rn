import React, { useEffect } from 'react';
import { Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useHomeViewModel } from '@hooks/useHomeViewModel';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { NoServerScreen } from '@components/NoServerScreen';
import { AlbumCard } from '@components/AlbumCard';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Album } from '@api/SubsonicTypes';
import { showAlbumActions } from '@utils/mediaActions';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { state, load, clearError, client } = useHomeViewModel();
  const { playSongs } = usePlaybackStore();

  useEffect(() => {
    load();
  }, [load]);

  if (state.type === 'Loading') return <LoadingScreen />;
  if (state.type === 'NoServer') {
    return <NoServerScreen onAddServer={() => navigation.navigate('Drawer', { screen: 'Servers' })} />;
  }
  if (state.type === 'Error') {
    return <ErrorScreen message={state.message} onRetry={() => { clearError(); load(); }} />;
  }

  const handleAlbumPress = async (album: Album) => {
    if (!client) return;
    const result = await client.getAlbum(album.id);
    if (!result.ok) return;
    const songs = result.data.song ?? [];
    if (songs.length === 0) return;
    await playSongs(
      songs,
      0,
      (id) => client.getStreamUrl(id),
      (id) => client.getCoverArtUrl(id)
    );
    navigation.navigate('NowPlaying');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>{state.title}</Text>
      <FlatList
        data={state.albums}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AlbumCard
            album={item}
            getCoverArtUrl={(id) => client!.getCoverArtUrl(id)}
            onPress={handleAlbumPress}
            onLongPress={(album) => client && showAlbumActions(album, client)}
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
  header: { color: '#fff', fontSize: 22, fontWeight: '700', margin: 16 },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  row: { justifyContent: 'space-around', marginBottom: 12 },
});
