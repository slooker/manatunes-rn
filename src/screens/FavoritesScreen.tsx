import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFavoritesStore } from '@store/useFavoritesStore';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { useRepository } from '@hooks/useRepository';
import { ArtistRow } from '@components/ArtistRow';
import { MiniPlayer } from '@components/MiniPlayer';
import { SongRow } from '@components/SongRow';
import { showAlbumActions, showArtistActions, showSongActions } from '@utils/mediaActions';

type Tab = 'artists' | 'albums' | 'songs';

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('artists');
  const { artists, albums, songs, loadFromStorage, syncFromServer } = useFavoritesStore();
  const { playSong } = usePlaybackStore();
  const client = useRepository();

  useEffect(() => {
    loadFromStorage().then(() => {
      if (client) {
        syncFromServer(client).catch(() => {
          // Keep the cached favorites visible if the server refresh fails.
        });
      }
    });
  }, [client, loadFromStorage, syncFromServer]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.tabs}>
        {(['artists', 'albums', 'songs'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.activeTab]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'artists' && (
        <FlatList
          data={artists}
          keyExtractor={(a) => a.id}
          ListEmptyComponent={<Text style={styles.empty}>No favorite artists</Text>}
          renderItem={({ item }) => (
            <ArtistRow
              artist={item}
              getCoverArtUrl={(id) => client?.getCoverArtUrl(id) ?? ''}
              onPress={(a) => navigation.navigate('ArtistDetail', { artistId: a.id, artistName: a.name })}
              onLongPress={(a) => client && showArtistActions(a, client)}
            />
          )}
        />
      )}

      {tab === 'albums' && (
        <FlatList
          data={albums}
          keyExtractor={(a) => a.id}
          ListEmptyComponent={<Text style={styles.empty}>No favorite albums</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.albumRow}
              onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id, albumName: item.name, artistName: item.artist })}
              onLongPress={() => client && showAlbumActions(item, client)}
            >
              <Text style={styles.albumName}>{item.name}</Text>
              <Text style={styles.albumArtist}>{item.artist}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === 'songs' && (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          ListEmptyComponent={<Text style={styles.empty}>No favorite songs</Text>}
          renderItem={({ item }) => (
            <SongRow
              song={item}
              getCoverArtUrl={(id) => client?.getCoverArtUrl(id) ?? ''}
              onPress={async (s) => {
                if (!client) return;
                await playSong(s, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
                navigation.navigate('NowPlaying');
              }}
              onLongPress={(song) => client && showSongActions(song, client)}
            />
          )}
        />
      )}

      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#D0BCFF' },
  tabText: { color: '#888', fontSize: 14, fontWeight: '500' },
  activeTabText: { color: '#D0BCFF' },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  albumRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  albumName: { color: '#fff', fontSize: 16 },
  albumArtist: { color: '#888', fontSize: 13, marginTop: 2 },
});
