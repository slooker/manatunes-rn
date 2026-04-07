import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Song } from '@api/SubsonicTypes';
import { formatDuration } from '@utils/formatDuration';
import { CoverArt } from './CoverArt';

interface SongRowProps {
  song: Song;
  getCoverArtUrl: (id: string) => string;
  onPress: (song: Song) => void;
  onLongPress?: (song: Song) => void;
  showTrackNumber?: boolean;
  isPlaying?: boolean;
}

export function SongRow({ song, getCoverArtUrl, onPress, onLongPress, showTrackNumber, isPlaying }: SongRowProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.playing]}
      onPress={() => onPress(song)}
      onLongPress={() => onLongPress?.(song)}
    >
      {showTrackNumber ? (
        <Text style={styles.trackNum}>{song.track ?? '—'}</Text>
      ) : (
        <CoverArt uri={song.coverArt ? getCoverArtUrl(song.coverArt) : undefined} size={44} />
      )}
      <View style={styles.info}>
        <Text style={[styles.title, isPlaying && styles.playingText]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  playing: { backgroundColor: '#1e1a2e' },
  trackNum: { width: 28, textAlign: 'center', color: '#888', fontSize: 14 },
  info: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '500' },
  playingText: { color: '#D0BCFF' },
  subtitle: { color: '#888', fontSize: 13 },
  duration: { color: '#666', fontSize: 13 },
});
