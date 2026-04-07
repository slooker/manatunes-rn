import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Artist } from '@api/SubsonicTypes';
import { CoverArt } from './CoverArt';

interface ArtistRowProps {
  artist: Artist;
  getCoverArtUrl: (id: string) => string;
  onPress: (artist: Artist) => void;
  onLongPress?: (artist: Artist) => void;
}

export function ArtistRow({ artist, getCoverArtUrl, onPress, onLongPress }: ArtistRowProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(artist)}
      onLongPress={() => onLongPress?.(artist)}
    >
      <CoverArt
        uri={artist.coverArt ? getCoverArtUrl(artist.coverArt) : undefined}
        size={48}
        borderRadius={24}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.albumCount !== undefined && (
          <Text style={styles.albums}>{artist.albumCount} albums</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
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
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 15, fontWeight: '500' },
  albums: { color: '#888', fontSize: 13 },
  chevron: { color: '#555', fontSize: 22 },
});
