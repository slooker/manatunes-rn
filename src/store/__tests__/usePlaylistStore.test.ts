import { usePlaylistStore } from '../usePlaylistStore';
import type { SubsonicClient } from '@api/SubsonicClient';
import type { Playlist } from '@api/SubsonicTypes';

function createPlaylistFixture(overrides?: Partial<Playlist>): Playlist {
  return { id: 'pl-1', name: 'Test Playlist', songCount: 0, ...overrides };
}

function createMockClient(): jest.Mocked<Pick<
  SubsonicClient,
  'getPlaylists' | 'getPlaylist' | 'createPlaylist' | 'updatePlaylist' | 'deletePlaylist' | 'replacePlaylistSongs'
>> {
  return {
    getPlaylists: jest.fn(),
    getPlaylist: jest.fn(),
    createPlaylist: jest.fn(),
    updatePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
    replacePlaylistSongs: jest.fn(),
  };
}

beforeEach(() => {
  usePlaylistStore.setState({ playlists: [] });
});

describe('usePlaylistStore', () => {
  test('syncFromServer populates playlists from getPlaylists', async () => {
    const client = createMockClient();
    const playlists = [createPlaylistFixture({ id: 'pl-1' }), createPlaylistFixture({ id: 'pl-2' })];
    client.getPlaylists.mockResolvedValue({ ok: true, data: { playlist: playlists } });

    await usePlaylistStore.getState().syncFromServer(client as unknown as SubsonicClient);

    expect(usePlaylistStore.getState().playlists).toEqual(playlists);
  });

  test('syncFromServer throws on server error', async () => {
    const client = createMockClient();
    client.getPlaylists.mockResolvedValue({ ok: false, isNetworkError: false, code: 50, message: 'denied' });

    await expect(usePlaylistStore.getState().syncFromServer(client as unknown as SubsonicClient)).rejects.toThrow(
      'denied'
    );
  });

  test('createPlaylist calls client.createPlaylist and appends the result', async () => {
    const client = createMockClient();
    const created = createPlaylistFixture({ id: 'pl-new', name: 'My List' });
    client.createPlaylist.mockResolvedValue({ ok: true, data: created });

    const result = await usePlaylistStore.getState().createPlaylist(client as unknown as SubsonicClient, 'My List');

    expect(client.createPlaylist).toHaveBeenCalledWith('My List');
    expect(result).toEqual(created);
    expect(usePlaylistStore.getState().playlists).toEqual([created]);
  });

  test('renamePlaylist patches the matching playlist', async () => {
    usePlaylistStore.setState({ playlists: [createPlaylistFixture({ id: 'pl-1', name: 'Old' })] });
    const client = createMockClient();
    client.updatePlaylist.mockResolvedValue({ ok: true, data: undefined });

    await usePlaylistStore.getState().renamePlaylist(client as unknown as SubsonicClient, 'pl-1', 'New');

    expect(client.updatePlaylist).toHaveBeenCalledWith('pl-1', { name: 'New' });
    expect(usePlaylistStore.getState().playlists[0].name).toBe('New');
  });

  test('deletePlaylist removes the matching playlist', async () => {
    usePlaylistStore.setState({ playlists: [createPlaylistFixture({ id: 'pl-1' }), createPlaylistFixture({ id: 'pl-2' })] });
    const client = createMockClient();
    client.deletePlaylist.mockResolvedValue({ ok: true, data: undefined });

    await usePlaylistStore.getState().deletePlaylist(client as unknown as SubsonicClient, 'pl-1');

    expect(client.deletePlaylist).toHaveBeenCalledWith('pl-1');
    expect(usePlaylistStore.getState().playlists.map((p) => p.id)).toEqual(['pl-2']);
  });

  test('addSongsToPlaylist calls updatePlaylist with songIdToAdd and refreshes songCount', async () => {
    usePlaylistStore.setState({ playlists: [createPlaylistFixture({ id: 'pl-1', songCount: 1 })] });
    const client = createMockClient();
    client.updatePlaylist.mockResolvedValue({ ok: true, data: undefined });
    client.getPlaylist.mockResolvedValue({ ok: true, data: createPlaylistFixture({ id: 'pl-1', songCount: 3 }) });

    await usePlaylistStore.getState().addSongsToPlaylist(client as unknown as SubsonicClient, 'pl-1', ['s1', 's2']);

    expect(client.updatePlaylist).toHaveBeenCalledWith('pl-1', { songIdToAdd: ['s1', 's2'] });
    expect(usePlaylistStore.getState().playlists[0].songCount).toBe(3);
  });

  test('removeSongFromPlaylist calls updatePlaylist with songIndexToRemove and refreshes songCount', async () => {
    usePlaylistStore.setState({ playlists: [createPlaylistFixture({ id: 'pl-1', songCount: 3 })] });
    const client = createMockClient();
    client.updatePlaylist.mockResolvedValue({ ok: true, data: undefined });
    client.getPlaylist.mockResolvedValue({ ok: true, data: createPlaylistFixture({ id: 'pl-1', songCount: 2 }) });

    await usePlaylistStore.getState().removeSongFromPlaylist(client as unknown as SubsonicClient, 'pl-1', 1);

    expect(client.updatePlaylist).toHaveBeenCalledWith('pl-1', { songIndexToRemove: [1] });
    expect(usePlaylistStore.getState().playlists[0].songCount).toBe(2);
  });

  test('reorderPlaylistSongs calls replacePlaylistSongs with the given id order', async () => {
    const client = createMockClient();
    client.replacePlaylistSongs.mockResolvedValue({ ok: true, data: createPlaylistFixture() });

    await usePlaylistStore.getState().reorderPlaylistSongs(client as unknown as SubsonicClient, 'pl-1', ['s2', 's1']);

    expect(client.replacePlaylistSongs).toHaveBeenCalledWith('pl-1', ['s2', 's1']);
  });
});
