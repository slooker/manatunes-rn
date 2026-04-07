import React, { useEffect, useState } from 'react';
import { Alert, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRepository } from '@hooks/useRepository';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { SongRow } from '@components/SongRow';
import { CoverArt } from '@components/CoverArt';
import { MiniPlayer } from '@components/MiniPlayer';
import { formatDuration } from '@utils/formatDuration';
import type { Album, Song } from '@api/SubsonicTypes';
import type { RootStackParamList } from '@navigation/types';
import { showSongActions } from '@utils/mediaActions';

type Route = RouteProp<RootStackParamList, 'AlbumDetail'>;

export default function AlbumDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const { albumId, albumName, artistName } = route.params;
  const client = useRepository();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playSongs, playSong } = usePlaybackStore();
  const { isAlbumFavorite, toggleAlbumFavorite } = useFavoritesStore();

  useEffect(() => {
    navigation.setOptions({ title: albumName });
    if (!client) return;
    setLoading(true);
    client.getAlbum(albumId).then((result) => {
      setLoading(false);
      if (result.ok) {
        setAlbum(result.data);
      } else {
        setError(result.isNetworkError ? 'Network error' : result.message);
      }
    });
  }, [client, albumId]);

  if (loading) return <LoadingScreen />;
  if (error || !album) return <ErrorScreen message={error ?? 'Album not found'} />;

  const songs = album.song ?? [];
  const isFav = isAlbumFavorite(albumId);
  const totalDuration = songs.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  const handlePlayAll = async () => {
    if (!client || songs.length === 0) return;
    await playSongs(songs, 0, (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
    navigation.navigate('NowPlaying');
  };

  const handleSongPress = async (song: Song) => {
    if (!client) return;
    await playSongs(songs, songs.indexOf(song), (id) => client.getStreamUrl(id), (id) => client.getCoverArtUrl(id));
    navigation.navigate('NowPlaying');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <CoverArt
              uri={album.coverArt ? client!.getCoverArtUrl(album.coverArt, 300) : undefined}
              size={200}
              borderRadius={8}
            />
            <Text style={styles.albumName}>{album.name}</Text>
            <Text style={styles.artist}>{artistName ?? album.artist}</Text>
            <Text style={styles.meta}>
              {songs.length} songs · {formatDuration(totalDuration)}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
                <Text style={styles.playBtnText}>▶ Play All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.favBtn, isFav && styles.favActive]}
                onPress={() =>
                  client &&
                  toggleAlbumFavorite({
                    id: albumId,
                    name: albumName,
                    artist: artistName,
                    coverArt: album.coverArt,
                  }, client).catch(() => {
                    Alert.alert('Favorite failed', 'Could not update favorites on your server.');
                  })
                }
              >
                <Text style={styles.favIcon}>{isFav ? '★' : '☆'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SongRow
            song={item}
            getCoverArtUrl={(id) => client!.getCoverArtUrl(id)}
            onPress={handleSongPress}
            onLongPress={(song) => client && showSongActions(song, client)}
            showTrackNumber
          />
        )}
        contentContainerStyle={styles.list}
      />
      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { paddingBottom: 16 },
  header: { alignItems: 'center', padding: 24, gap: 8 },
  albumName: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  artist: { color: '#aaa', fontSize: 16 },
  meta: { color: '#666', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  playBtn: {
    backgroundColor: '#6650a4',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  playBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  favBtn: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#444' },
  favActive: { borderColor: '#D0BCFF' },
  favIcon: { color: '#D0BCFF', fontSize: 22 },
});
