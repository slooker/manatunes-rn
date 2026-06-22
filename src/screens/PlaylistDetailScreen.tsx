import React, { useEffect, useState, useCallback } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaylistStore } from '@store/usePlaylistStore';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { useRepository } from '@hooks/useRepository';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { formatDuration } from '@utils/formatDuration';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Song } from '@api/SubsonicTypes';
import type { RootStackParamList } from '@navigation/types';

type Route = RouteProp<RootStackParamList, 'PlaylistDetail'>;

export default function PlaylistDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const { playlistId, playlistName } = route.params;
  const client = useRepository();
  const { removeSongFromPlaylist, reorderPlaylistSongs } = usePlaylistStore();
  const { playSongs } = usePlaybackStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: playlistName });
  }, [playlistName]);

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    client.getPlaylist(playlistId).then((result) => {
      setLoading(false);
      if (result.ok) {
        setSongs(result.data.entry ?? []);
      } else {
        setError(result.isNetworkError ? 'Network error' : result.message);
      }
    });
  }, [client, playlistId]);

  const handlePlayAll = async () => {
    if (!client || songs.length === 0) return;
    await playSongs(songs, 0, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
    navigation.navigate('NowPlaying');
  };

  const handleDragEnd = useCallback(
    async ({ data, from, to }: { data: Song[]; from: number; to: number }) => {
      if (!client || from === to) return;
      const previous = songs;
      setSongs(data);
      try {
        await reorderPlaylistSongs(client, playlistId, data.map((s) => s.id));
      } catch (e) {
        setSongs(previous);
        Alert.alert('Reorder failed', (e as Error).message);
      }
    },
    [client, playlistId, songs, reorderPlaylistSongs]
  );

  const handleRemove = useCallback(
    async (index: number) => {
      if (!client) return;
      const previous = songs;
      setSongs(songs.filter((_, i) => i !== index));
      try {
        await removeSongFromPlaylist(client, playlistId, index);
      } catch (e) {
        setSongs(previous);
        Alert.alert('Remove song failed', (e as Error).message);
      }
    },
    [client, playlistId, songs, removeSongFromPlaylist]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Song>) => (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[styles.item, isActive && styles.dragging]}
        >
          <Text style={styles.drag}>⠿</Text>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
          </View>
          <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          <TouchableOpacity onPress={() => handleRemove(getIndex()!)}>
            <Text style={styles.remove}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [handleRemove]
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.count}>{songs.length} songs</Text>
        <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
          <Text style={styles.playBtnText}>▶ Play All</Text>
        </TouchableOpacity>
      </View>
        <DraggableFlatList
          data={songs}
          keyExtractor={(s, index) => `${s.id}-${index}`}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
      />
      <MiniPlayer />
    </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  count: { color: '#888', fontSize: 14 },
  playBtn: { backgroundColor: '#6650a4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  playBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: 80 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
    gap: 10,
  },
  dragging: { backgroundColor: '#2a2040', elevation: 8 },
  drag: { color: '#555', fontSize: 18 },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '500' },
  artist: { color: '#888', fontSize: 12 },
  duration: { color: '#666', fontSize: 12 },
  remove: { color: '#666', fontSize: 16, padding: 8 },
});
