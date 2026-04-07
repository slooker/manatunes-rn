import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Album } from '@api/SubsonicTypes';
import { CoverArt } from './CoverArt';

interface AlbumCardProps {
  album: Album;
  getCoverArtUrl: (id: string) => string;
  onPress: (album: Album) => void;
  onLongPress?: (album: Album) => void;
  size?: number;
}

export function AlbumCard({ album, getCoverArtUrl, onPress, onLongPress, size = 160 }: AlbumCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { width: size }]}
      onPress={() => onPress(album)}
      onLongPress={() => onLongPress?.(album)}
    >
      <CoverArt
        uri={album.coverArt ? getCoverArtUrl(album.coverArt) : undefined}
        size={size}
        borderRadius={8}
      />
      <Text style={styles.title} numberOfLines={1}>
        {album.name}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {album.artist}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  title: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 6 },
  artist: { color: '#888', fontSize: 12 },
});
