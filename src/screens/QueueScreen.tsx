import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Track } from 'react-native-track-player';

import { usePlaybackStore } from '@store/usePlaybackStore';
import { formatDuration } from '@utils/formatDuration';

export default function QueueScreen() {
  const { queue, currentTrack, reorderQueue, removeFromQueue, skipToQueueItem } = usePlaybackStore();
  const insets = useSafeAreaInsets();

  const handleDragEnd = useCallback(
    ({ from, to }: { data: Track[]; from: number; to: number }) => {
      reorderQueue(from, to);
    },
    [reorderQueue]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<Track>) => {
      const index = getIndex() ?? 0;
      const isCurrent = item.id === currentTrack?.id;
      return (
        <ScaleDecorator>
          <TouchableOpacity
            onPress={() => skipToQueueItem(index)}
            onLongPress={drag}
            disabled={isActive}
            style={[styles.item, isCurrent && styles.currentItem, isActive && styles.dragging]}
          >
            <View style={styles.dragHandle}>
              <Text style={styles.dragIcon}>⠿</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.title, isCurrent && styles.currentTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artist}
              </Text>
            </View>
            <Text style={styles.duration}>
              {typeof item.duration === 'number' ? formatDuration(item.duration) : ''}
            </Text>
            <TouchableOpacity onPress={() => removeFromQueue(index)} style={styles.removeBtn}>
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [currentTrack, skipToQueueItem, removeFromQueue]
  );

  if (queue.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>Queue is empty</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Queue ({queue.length})</Text>
      <DraggableFlatList
        data={queue}
        keyExtractor={(item, index) => `${item.id ?? 'track'}-${index}`}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.list}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  empty: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  header: { color: '#fff', fontSize: 20, fontWeight: '700', margin: 16 },
  list: { paddingBottom: 32 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
    gap: 8,
  },
  currentItem: { backgroundColor: '#1e1a2e' },
  dragging: { backgroundColor: '#2a2040', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3 },
  dragHandle: { padding: 8 },
  dragIcon: { color: '#555', fontSize: 18 },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '500' },
  currentTitle: { color: '#D0BCFF' },
  artist: { color: '#888', fontSize: 12 },
  duration: { color: '#666', fontSize: 12 },
  removeBtn: { padding: 8 },
  removeIcon: { color: '#666', fontSize: 16 },
});
