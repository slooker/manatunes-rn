import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSearchViewModel } from '../useSearchViewModel';
import { createArtistList, createAlbumList, createSongList } from '@utils/testFixtures';

const mockClient = {
  search3: jest.fn(),
};

jest.mock('../useRepository', () => ({
  useRepository: () => mockClient,
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSearchViewModel', () => {
  test('initial state is Idle', () => {
    const { result } = renderHook(() => useSearchViewModel());
    expect(result.current.state.type).toBe('Idle');
    expect(result.current.query).toBe('');
  });

  test('updateQuery with empty string sets state to Idle', async () => {
    mockClient.search3.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('rock'));
    act(() => result.current.updateQuery(''));
    expect(result.current.state.type).toBe('Idle');
  });

  test('updateQuery with blank string sets state to Idle', () => {
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('   '));
    expect(result.current.state.type).toBe('Idle');
  });

  test('updateQuery with valid query sets Loading state', () => {
    mockClient.search3.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('rock'));
    expect(result.current.state.type).toBe('Loading');
  });

  test('search with successful response updates state to Results', async () => {
    const artists = createArtistList(2);
    const albums = createAlbumList(3);
    const songs = createSongList(5);
    mockClient.search3.mockResolvedValue({ ok: true, data: { artist: artists, album: albums, song: songs } });

    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('rock'));
    act(() => jest.advanceTimersByTime(300));

    await waitFor(() => expect(result.current.state.type).toBe('Results'));
    if (result.current.state.type === 'Results') {
      expect(result.current.state.artists).toHaveLength(2);
      expect(result.current.state.albums).toHaveLength(3);
      expect(result.current.state.songs).toHaveLength(5);
    }
  });

  test('search calls client with correct parameters', async () => {
    mockClient.search3.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('jazz'));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(mockClient.search3).toHaveBeenCalled());
    expect(mockClient.search3).toHaveBeenCalledWith('jazz', 10, 10, 20);
  });

  test('search with API error updates state to Error', async () => {
    mockClient.search3.mockResolvedValue({ ok: false, isNetworkError: false, code: 0, message: 'Server error' });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('test'));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.state.type).toBe('Error'));
    if (result.current.state.type === 'Error') {
      expect(result.current.state.message).toBe('Server error');
    }
  });

  test('search with network error updates state to Error', async () => {
    mockClient.search3.mockResolvedValue({ ok: false, isNetworkError: true, isTimeout: false, error: new Error('net') });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('test'));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.state.type).toBe('Error'));
    if (result.current.state.type === 'Error') {
      expect(result.current.state.message).toContain('Network error');
    }
  });

  test('clearSearch resets state to Idle and clears query', () => {
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('rock'));
    act(() => result.current.clearSearch());
    expect(result.current.query).toBe('');
    expect(result.current.state.type).toBe('Idle');
  });

  test('search query updates query state', () => {
    mockClient.search3.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('metal'));
    expect(result.current.query).toBe('metal');
  });

  test('search with empty results shows Results state with empty lists', async () => {
    mockClient.search3.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('xyzzy'));
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() => expect(result.current.state.type).toBe('Results'));
    if (result.current.state.type === 'Results') {
      expect(result.current.state.artists).toHaveLength(0);
      expect(result.current.state.albums).toHaveLength(0);
      expect(result.current.state.songs).toHaveLength(0);
    }
  });

  test('debounce: does not call search before 300ms', () => {
    mockClient.search3.mockResolvedValue({ ok: true, data: {} });
    const { result } = renderHook(() => useSearchViewModel());
    act(() => result.current.updateQuery('rock'));
    act(() => jest.advanceTimersByTime(200));
    expect(mockClient.search3).not.toHaveBeenCalled();
  });
});
