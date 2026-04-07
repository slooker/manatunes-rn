import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SearchScreen from '../SearchScreen';
import { createArtistList, createSongList } from '@utils/testFixtures';

const mockUpdateQuery = jest.fn();
const mockClearSearch = jest.fn();
let mockState: any = { type: 'Idle' };
let mockClient: any = null;

jest.mock('@hooks/useSearchViewModel', () => ({
  useSearchViewModel: () => ({
    query: '',
    state: mockState,
    updateQuery: mockUpdateQuery,
    clearSearch: mockClearSearch,
    client: mockClient,
  }),
}));

jest.mock('@store/usePlaybackStore', () => ({
  usePlaybackStore: (selector?: Function) => {
    const store = { currentTrack: null, isPlaying: false, playSong: jest.fn(), playSongs: jest.fn(), togglePlayPause: jest.fn(), skipToNext: jest.fn() };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { type: 'Idle' };
    mockClient = null;
  });

  test('shows search input', () => {
    render(<SearchScreen />);
    expect(screen.getByTestId('search-input')).toBeTruthy();
  });

  test('shows idle message when no query', () => {
    mockState = { type: 'Idle' };
    render(<SearchScreen />);
    expect(screen.getByTestId('search-idle')).toBeTruthy();
    expect(screen.getByText('Search for music')).toBeTruthy();
  });

  test('shows loading indicator during search', () => {
    mockState = { type: 'Loading' };
    render(<SearchScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  test('calls updateQuery when text changes', () => {
    render(<SearchScreen />);
    fireEvent.changeText(screen.getByTestId('search-input'), 'rock');
    expect(mockUpdateQuery).toHaveBeenCalledWith('rock');
  });

  test('shows artists section when results contain artists', () => {
    mockState = {
      type: 'Results',
      artists: createArtistList(2),
      albums: [],
      songs: [],
    };
    render(<SearchScreen />);
    expect(screen.getByText('Artists')).toBeTruthy();
    expect(screen.getByText('Artist 1')).toBeTruthy();
  });

  test('shows songs section when results contain songs', () => {
    mockState = {
      type: 'Results',
      artists: [],
      albums: [],
      songs: createSongList(3),
    };
    mockClient = { getCoverArtUrl: jest.fn(() => ''), getStreamUrl: jest.fn(() => '') };
    render(<SearchScreen />);
    expect(screen.getByText('Songs')).toBeTruthy();
    expect(screen.getByText('Song 1')).toBeTruthy();
  });

  test('shows error message on search failure', () => {
    mockState = { type: 'Error', message: 'Search failed' };
    render(<SearchScreen />);
    expect(screen.getByText('Search failed')).toBeTruthy();
  });
});
