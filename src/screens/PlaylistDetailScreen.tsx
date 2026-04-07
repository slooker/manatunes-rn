import React, { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaylistStore } from '@store/usePlaylistStore';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { useRepository } from '@hooks/useRepository';
import { formatDuration } from '@utils/formatDuration';
import { MiniPlayer } from '@components/MiniPlayer';
import type { FavoriteSong } from '@store/useFavoritesStore';
import type { RootStackParamList } from '@navigation/types';

type Route = RouteProp<RootStackParamList, 'PlaylistDetail'>;

export default function PlaylistDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const { playlistId, playlistName } = route.params;
  const { playlists, removeSongFromPlaylist, reorderPlaylistSongs } = usePlaylistStore();
  const { playSongs } = usePlaybackStore();
  const client = useRepository();

  useEffect(() => {
    navigation.setOptions({ title: playlistName });
  }, [playlistName]);

  const playlist = playlists.find((p) => p.id === playlistId);
  const songs = playlist?.songs ?? [];

  const handlePlayAll = async () => {
    if (!client || songs.length === 0) return;
    const fullSongs = songs.map((s) => ({
      id: s.id, title: s.title, artist: s.artist, album: s.album,
      albumId: s.albumId, duration: s.duration, coverArt: s.coverArt,
    }));
    await playSongs(fullSongs, 0, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
    navigation.navigate('NowPlaying');
  };

  const handleDragEnd = useCallback(
    ({ from, to }: { data: FavoriteSong[]; from: number; to: number }) => {
      reorderPlaylistSongs(playlistId, from, to);
    },
    [playlistId, reorderPlaylistSongs]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<FavoriteSong>) => (
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
          <TouchableOpacity onPress={() => removeSongFromPlaylist(playlistId, item.id)}>
            <Text style={styles.remove}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    ),
    [playlistId, removeSongFromPlaylist]
  );

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
