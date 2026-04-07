import React from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSearchViewModel } from '@hooks/useSearchViewModel';
import { usePlaybackStore } from '@store/usePlaybackStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { SongRow } from '@components/SongRow';
import { ArtistRow } from '@components/ArtistRow';
import { AlbumCard } from '@components/AlbumCard';
import { MiniPlayer } from '@components/MiniPlayer';
import type { Song, Artist, Album } from '@api/SubsonicTypes';
import { showAlbumActions, showArtistActions, showSongActions } from '@utils/mediaActions';

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const { query, state, updateQuery, client } = useSearchViewModel();
  const { playSong, playSongs } = usePlaybackStore();

  const handleSongPress = async (song: Song) => {
    if (!client) return;
    await playSong(
      song,
      (id) => client.getStreamUrl(id),
      (id) => client.getCoverArtUrl(id)
    );
    navigation.navigate('NowPlaying');
  };

  const handleArtistPress = (artist: Artist) => {
    navigation.navigate('ArtistDetail', { artistId: artist.id, artistName: artist.name });
  };

  const handleAlbumPress = (album: Album) => {
    navigation.navigate('AlbumDetail', {
      albumId: album.id,
      albumName: album.name,
      artistName: album.artist,
    });
  };

  const sections =
    state.type === 'Results'
      ? [
          ...(state.artists.length > 0 ? [{ title: 'Artists', data: state.artists, type: 'artist' as const }] : []),
          ...(state.albums.length > 0 ? [{ title: 'Albums', data: state.albums, type: 'album' as const }] : []),
          ...(state.songs.length > 0 ? [{ title: 'Songs', data: state.songs, type: 'song' as const }] : []),
        ]
      : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search artists, albums, songs…"
          placeholderTextColor="#666"
          value={query}
          onChangeText={updateQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          testID="search-input"
        />
      </View>

      {state.type === 'Idle' && (
        <View style={styles.empty} testID="search-idle">
          <Text style={styles.emptyText}>Search for music</Text>
        </View>
      )}

      {state.type === 'Loading' && <LoadingScreen />}

      {state.type === 'Error' && (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{state.message}</Text>
        </View>
      )}

      {state.type === 'Results' && (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, section }: any) => {
            if (section.type === 'artist') {
              return (
                <ArtistRow
                  artist={item}
                  getCoverArtUrl={(id) => client!.getCoverArtUrl(id)}
                  onPress={handleArtistPress}
                  onLongPress={(artist) => client && showArtistActions(artist, client)}
                />
              );
            }
            if (section.type === 'album') {
              return (
                <TouchableOpacity
                  onPress={() => handleAlbumPress(item)}
                  onLongPress={() => client && showAlbumActions(item, client)}
                  style={styles.albumRow}
                >
                  <Text style={styles.albumName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <SongRow
                song={item}
                getCoverArtUrl={(id) => client!.getCoverArtUrl(id)}
                onPress={handleSongPress}
                onLongPress={(song) => client && showSongActions(song, client)}
              />
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}

      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  searchBar: { padding: 12, backgroundColor: '#1a1a2e' },
  input: {
    backgroundColor: '#2a2a3e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  errorText: { color: '#cf6679', fontSize: 16 },
  sectionHeader: {
    color: '#D0BCFF',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0f0f1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: { paddingBottom: 16 },
  albumRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222' },
  albumName: { color: '#fff', fontSize: 15 },
  albumArtist: { color: '#888', fontSize: 13 },
});
