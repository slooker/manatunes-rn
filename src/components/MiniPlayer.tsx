import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { usePlaybackStore } from '@store/usePlaybackStore';
import { CoverArt } from './CoverArt';

export function MiniPlayer() {
  const navigation = useNavigation<any>();
  const { currentTrack, isPlaying, togglePlayPause } = usePlaybackStore();

  if (!currentTrack) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => navigation.navigate('NowPlaying')}
      activeOpacity={0.9}
    >
      <CoverArt uri={currentTrack.artwork as string | undefined} size={48} borderRadius={4} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>
      <TouchableOpacity onPress={togglePlayPause} style={styles.control}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={styles.controlIcon.color}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => usePlaybackStore.getState().skipToNext()}
        style={styles.control}
      >
        <Ionicons name="play-skip-forward" size={24} color={styles.controlIcon.color} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    gap: 12,
  },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#aaa', fontSize: 12 },
  control: { padding: 8 },
  controlIcon: { fontSize: 22, color: '#D0BCFF' },
});
