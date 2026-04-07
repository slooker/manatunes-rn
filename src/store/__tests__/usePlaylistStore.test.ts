import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlaylistStore } from '../usePlaylistStore';
import { createSong } from '@utils/testFixtures';

beforeEach(async () => {
  await AsyncStorage.clear();
  usePlaylistStore.setState({ playlists: [] });
});

describe('usePlaylistStore', () => {
  test('createPlaylist generates playlist with unique ID', async () => {
    const p1 = await usePlaylistStore.getState().createPlaylist('My List');
    const p2 = await usePlaylistStore.getState().createPlaylist('Another List');
    expect(p1.id).not.toBe(p2.id);
    expect(p1.name).toBe('My List');
  });

  test('createPlaylist sets creation timestamp', async () => {
    const before = Date.now();
    const p = await usePlaylistStore.getState().createPlaylist('Test');
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });

  test('createPlaylist persists to AsyncStorage', async () => {
    await usePlaylistStore.getState().createPlaylist('My List');
    const stored = await AsyncStorage.getItem('playlists');
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('My List');
  });

  test('getPlaylists returns empty list when no playlists exist', () => {
    expect(usePlaylistStore.getState().playlists).toHaveLength(0);
  });

  test('addSongsToPlaylist adds songs and persists', async () => {
    const p = await usePlaylistStore.getState().createPlaylist('Test');
    const songs = [createSong({ id: 's1' }), createSong({ id: 's2' })];
    await usePlaylistStore.getState().addSongsToPlaylist(p.id, songs);
    const playlist = usePlaylistStore.getState().playlists.find((pl) => pl.id === p.id);
    expect(playlist?.songs).toHaveLength(2);
  });

  test('addSongsToPlaylist deduplicates by song id', async () => {
    const p = await usePlaylistStore.getState().createPlaylist('Test');
    const song = createSong({ id: 's1' });
    await usePlaylistStore.getState().addSongsToPlaylist(p.id, [song]);
    await usePlaylistStore.getState().addSongsToPlaylist(p.id, [song]);
    const playlist = usePlaylistStore.getState().playlists.find((pl) => pl.id === p.id);
    expect(playlist?.songs).toHaveLength(1);
  });

  test('removeSongFromPlaylist removes and persists', async () => {
    const p = await usePlaylistStore.getState().createPlaylist('Test');
    await usePlaylistStore.getState().addSongsToPlaylist(p.id, [createSong({ id: 's1' }), createSong({ id: 's2' })]);
    await usePlaylistStore.getState().removeSongFromPlaylist(p.id, 's1');
    const playlist = usePlaylistStore.getState().playlists.find((pl) => pl.id === p.id);
    expect(playlist?.songs).toHaveLength(1);
    expect(playlist?.songs[0].id).toBe('s2');
  });

  test('deletePlaylist removes from store and storage', async () => {
    const p = await usePlaylistStore.getState().createPlaylist('Test');
    await usePlaylistStore.getState().deletePlaylist(p.id);
    expect(usePlaylistStore.getState().playlists).toHaveLength(0);
    const stored = await AsyncStorage.getItem('playlists');
    expect(JSON.parse(stored!)).toHaveLength(0);
  });

  test('updatePlaylistName persists to storage', async () => {
    const p = await usePlaylistStore.getState().createPlaylist('Old Name');
    await usePlaylistStore.getState().updatePlaylistName(p.id, 'New Name');
    const playlist = usePlaylistStore.getState().playlists.find((pl) => pl.id === p.id);
    expect(playlist?.name).toBe('New Name');
    const stored = await AsyncStorage.getItem('playlists');
    expect(JSON.parse(stored!)[0].name).toBe('New Name');
  });

  test('reorderPlaylistSongs moves song and persists', async () => {
    const p = await usePlaylistStore.getState().createPlaylist('Test');
    const songs = [createSong({ id: 's1' }), createSong({ id: 's2' }), createSong({ id: 's3' })];
    await usePlaylistStore.getState().addSongsToPlaylist(p.id, songs);
    await usePlaylistStore.getState().reorderPlaylistSongs(p.id, 0, 2);
    const playlist = usePlaylistStore.getState().playlists.find((pl) => pl.id === p.id);
    expect(playlist?.songs[0].id).toBe('s2');
    expect(playlist?.songs[2].id).toBe('s1');
  });

  test('multiple playlists can be created with distinct IDs', async () => {
    const p1 = await usePlaylistStore.getState().createPlaylist('A');
    const p2 = await usePlaylistStore.getState().createPlaylist('B');
    const p3 = await usePlaylistStore.getState().createPlaylist('C');
    const ids = [p1.id, p2.id, p3.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });
});
