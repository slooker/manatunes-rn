import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDownloadStore } from '@store/useDownloadStore';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { MiniPlayer } from '@components/MiniPlayer';
import { CoverArt } from '@components/CoverArt';

export default function DownloadsScreen() {
  const navigation = useNavigation<any>();
  const { albums, activeDownloads, loadFromStorage, deleteDownload } = useDownloadStore();
  const { playSongs } = usePlaybackStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  const handlePlay = async (albumId: string) => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;
    const songs = album.songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      track: s.track,
      duration: s.duration,
    }));
    // Use local file URLs
    await playSongs(
      songs,
      0,
      (id) => {
        const song = album.songs.find((s) => s.id === id);
        return song ? `file://${song.localPath}` : '';
      },
      () => album.coverArtPath ? `file://${album.coverArtPath}` : ''
    );
    navigation.navigate('NowPlaying');
  };

  const handleDelete = (albumId: string, name: string) => {
    Alert.alert('Delete Download', `Remove "${name}" from downloads?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(albumId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {Object.keys(activeDownloads).length > 0 && (
        <View style={styles.progressBanner}>
          {Object.values(activeDownloads).map((p) => (
            <Text key={p.albumId} style={styles.progressText}>
              Downloading {p.current}/{p.total}: {p.songTitle}
            </Text>
          ))}
        </View>
      )}

      <FlatList
        data={albums}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No downloaded albums</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePlay(item.id)}
            onLongPress={() => handleDelete(item.id, item.name)}
          >
            <CoverArt
              uri={item.coverArtPath ? `file://${item.coverArtPath}` : undefined}
              size={150}
              borderRadius={8}
            />
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
          </TouchableOpacity>
        )}
      />

      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  progressBanner: { backgroundColor: '#1e1a2e', padding: 12 },
  progressText: { color: '#D0BCFF', fontSize: 13 },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  row: { justifyContent: 'space-around', marginBottom: 12 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  card: { width: 150, marginBottom: 4 },
  name: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 6 },
  artist: { color: '#888', fontSize: 12 },
});
