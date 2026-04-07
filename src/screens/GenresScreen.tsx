import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRepository } from '@hooks/useRepository';
import { useNoServerRedirect } from '@hooks/useNoServerRedirect';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { NoServerScreen } from '@components/NoServerScreen';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Genre } from '@api/SubsonicTypes';

const RANDOM_COUNT = 50;

export default function GenresScreen() {
  const navigation = useNavigation<any>();
  const client = useRepository();
  const { hasNoServers, goToServers } = useNoServerRedirect(navigation);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const { playSongs } = usePlaybackStore();

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    client.getGenres().then((result) => {
      setLoading(false);
      if (result.ok) {
        const sorted = (result.data.genre ?? [])
          .filter((g) => (g.songCount ?? 0) > 0)
          .sort((a, b) => a.value.localeCompare(b.value));
        setGenres(sorted);
      } else {
        setError(result.isNetworkError ? 'Network error' : result.message);
      }
    });
  }, [client]);

  const handleGenrePress = async (genre: Genre) => {
    if (!client) return;
    setPlaying(genre.value);
    try {
      const result = await client.getRandomSongs(RANDOM_COUNT, genre.value);
      if (!result.ok) {
        Alert.alert('Error', result.isNetworkError ? 'Network error' : result.message);
        return;
      }
      const songs = result.data.song ?? [];
      if (songs.length === 0) {
        Alert.alert('No Songs', `No songs found for genre "${genre.value}".`);
        return;
      }
      await playSongs(
        songs,
        0,
        (id) => client.getStreamUrl(id),
        (id) => client.getCoverArtUrl(id)
      );
      navigation.navigate('NowPlaying');
    } finally {
      setPlaying(null);
    }
  };

  if (hasNoServers) return <NoServerScreen onAddServer={goToServers} />;
  if (loading) return <LoadingScreen />;
  if (error) {
    return <ErrorScreen message={error} onRetry={() => { setError(null); setLoading(true); }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={genres}
        keyExtractor={(g) => g.value}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isLoading = playing === item.value;
          return (
            <TouchableOpacity
              style={[styles.item, isLoading && styles.itemLoading]}
              onPress={() => handleGenrePress(item)}
              disabled={playing !== null}
            >
              <View style={styles.info}>
                <Text style={styles.name}>{item.value}</Text>
                <Text style={styles.count}>
                  {item.songCount ?? 0} songs
                  {item.albumCount ? ` · ${item.albumCount} albums` : ''}
                </Text>
              </View>
              {isLoading ? (
                <Text style={styles.loadingDots}>···</Text>
              ) : (
                <Text style={styles.playIcon}>▶</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No genres found</Text>
          </View>
        }
      />
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { paddingVertical: 8, paddingBottom: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  itemLoading: { opacity: 0.5 },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: '500' },
  count: { color: '#888', fontSize: 13, marginTop: 2 },
  playIcon: { color: '#D0BCFF', fontSize: 18, paddingLeft: 8 },
  loadingDots: { color: '#D0BCFF', fontSize: 20, paddingLeft: 8, letterSpacing: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { color: '#666', fontSize: 16 },
});
