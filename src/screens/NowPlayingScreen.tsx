import React from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaybackStore } from '@store/usePlaybackStore';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { useRepository } from '@hooks/useRepository';
import { CoverArt } from '@components/CoverArt';
import { formatDuration } from '@utils/formatDuration';
import { RepeatMode } from 'react-native-track-player';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 64;

function getTrackMetadata(description?: unknown) {
  if (typeof description !== 'string') return undefined;

  try {
    return JSON.parse(description) as { albumId?: string; artistId?: string };
  } catch {
    return undefined;
  }
}

export default function NowPlayingScreen() {
  const navigation = useNavigation<any>();
  const client = useRepository();
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    repeatMode,
    shuffleEnabled,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    cycleRepeatMode,
    toggleShuffle,
  } = usePlaybackStore();
  const { isSongFavorite, toggleSongFavorite } = useFavoritesStore();

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.empty} edges={['top']}>
        <Text style={styles.emptyText}>Nothing playing</Text>
      </SafeAreaView>
    );
  }

  const repeatIcon = repeatMode === RepeatMode.Track ? 'repeat-outline' : 'repeat';
  const repeatActive = repeatMode !== RepeatMode.Off;
  const metadata = getTrackMetadata(currentTrack.description);
  const albumId = metadata?.albumId;
  const artistId = metadata?.artistId;
  const trackId = currentTrack.id?.toString();
  const isFavorite = trackId ? isSongFavorite(trackId) : false;
  const albumLabel = currentTrack.album?.toString() || 'View album';

  const handleStar = async () => {
    if (!trackId || !client) return;

    await toggleSongFavorite({
      id: trackId,
      title: currentTrack.title?.toString() ?? 'Unknown Track',
      artist: currentTrack.artist?.toString(),
      album: currentTrack.album?.toString(),
      albumId,
      duration: typeof currentTrack.duration === 'number' ? currentTrack.duration : undefined,
    }, client).catch(() => {
      Alert.alert('Favorite failed', 'Could not update favorites on your server.');
    });
  };

  const handleArtistPress = () => {
    if (!artistId || !currentTrack.artist) return;
    navigation.navigate('ArtistDetail', {
      artistId,
      artistName: currentTrack.artist,
    });
  };

  const handleAlbumPress = () => {
    if (!albumId) return;
    navigation.navigate('AlbumDetail', {
      albumId,
      albumName: albumLabel,
      artistName: currentTrack.artist,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CoverArt
        uri={currentTrack.artwork as string | undefined}
        size={ARTWORK_SIZE}
        borderRadius={12}
        style={styles.artwork}
      />

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            {artistId && currentTrack.artist ? (
              <TouchableOpacity onPress={handleArtistPress} activeOpacity={0.75} hitSlop={8}>
                <Text style={styles.artistLink} numberOfLines={1}>{currentTrack.artist}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
            )}
            {albumId ? (
              <TouchableOpacity onPress={handleAlbumPress} activeOpacity={0.75} hitSlop={8}>
                <Text style={styles.albumLink} numberOfLines={1}>{albumLabel}</Text>
              </TouchableOpacity>
            ) : currentTrack.album ? (
              <Text style={styles.album} numberOfLines={1}>{currentTrack.album}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={handleStar} style={styles.starBtn}>
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={26} color={styles.starIcon.color} />
            <Text style={styles.starIcon}>☆</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progress}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={position}
          onSlidingComplete={seekTo}
          minimumTrackTintColor="#D0BCFF"
          maximumTrackTintColor="#444"
          thumbTintColor="#D0BCFF"
        />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatDuration(position)}</Text>
          <Text style={styles.time}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.sideBtn}>
          <Ionicons
            name="shuffle"
            size={24}
            color={shuffleEnabled ? styles.active.color : styles.sideBtnIcon.color}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToPrevious} style={styles.navBtn}>
          <Ionicons name="play-skip-back" size={34} color={styles.navIcon.color} />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={styles.playBtn}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={34}
            color={styles.playIcon.color}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipToNext} style={styles.navBtn}>
          <Ionicons name="play-skip-forward" size={34} color={styles.navIcon.color} />
        </TouchableOpacity>

        <TouchableOpacity onPress={cycleRepeatMode} style={styles.sideBtn}>
          <View>
            <Ionicons
              name={repeatIcon}
              size={24}
              color={repeatActive ? styles.active.color : styles.sideBtnIcon.color}
            />
            {repeatMode === RepeatMode.Track && <Text style={styles.repeatOne}>1</Text>}
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.queueBtn}
        onPress={() => navigation.navigate('Queue')}
      >
        <Text style={styles.queueBtnText}>📋 Queue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', paddingTop: 16 },
  empty: { flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666', fontSize: 16 },
  artwork: { marginBottom: 24 },
  info: { width: '100%', paddingHorizontal: 32, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleBlock: { flex: 1 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  artist: { color: '#aaa', fontSize: 16, marginTop: 4 },
  artistLink: { color: '#D0BCFF', fontSize: 16, marginTop: 4, fontWeight: '600' },
  album: { color: '#777', fontSize: 14, marginTop: 3 },
  albumLink: { color: '#b8a8ee', fontSize: 14, marginTop: 3, fontWeight: '500' },
  starBtn: { padding: 8 },
  starIcon: { display: 'none', color: '#D0BCFF' },
  progress: { width: '100%', paddingHorizontal: 24 },
  slider: { width: '100%', height: 40 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
  time: { color: '#888', fontSize: 13 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  sideBtn: { padding: 12 },
  sideBtnIcon: { fontSize: 22, color: '#666' },
  active: { color: '#D0BCFF' },
  repeatOne: {
    color: '#D0BCFF',
    fontSize: 10,
    fontWeight: '700',
    position: 'absolute',
    right: -2,
    bottom: -4,
  },
  navBtn: { padding: 12 },
  navIcon: { fontSize: 32, color: '#fff' },
  playBtn: {
    backgroundColor: '#6650a4',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 32, color: '#fff' },
  queueBtn: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a3e' },
  queueBtnText: { color: '#aaa', fontSize: 14 },
});
