import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import { createAlbumList } from '@utils/testFixtures';

// Mock the view model hook
const mockLoad = jest.fn();
const mockClearError = jest.fn();
let mockState: any = { type: 'Loading' };
let mockClient: any = null;

jest.mock('@hooks/useHomeViewModel', () => ({
  useHomeViewModel: () => ({
    state: mockState,
    load: mockLoad,
    clearError: mockClearError,
    client: mockClient,
  }),
}));

jest.mock('@hooks/useRepository', () => ({
  useRepository: () => mockClient,
}));

jest.mock('@store/usePlaybackStore', () => ({
  usePlaybackStore: (selector?: Function) => {
    const store = { currentTrack: null, isPlaying: false, playSongs: jest.fn(), togglePlayPause: jest.fn(), skipToNext: jest.fn() };
    return selector ? selector(store) : store;
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { type: 'Loading' };
    mockClient = null;
  });

  test('shows loading indicator during load', () => {
    mockState = { type: 'Loading' };
    render(<HomeScreen />);
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  test('shows album grid on success', async () => {
    mockState = { type: 'Success', albums: createAlbumList(4), title: 'Frequently Played' };
    mockClient = { getCoverArtUrl: jest.fn(() => 'http://test'), getStreamUrl: jest.fn(() => 'http://test'), getAlbum: jest.fn() };
    render(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Frequently Played')).toBeTruthy());
    expect(screen.getByText('Album 1')).toBeTruthy();
  });

  test('shows no-server message when not configured', () => {
    mockState = { type: 'NoServer' };
    render(<HomeScreen />);
    expect(screen.getByTestId('no-server')).toBeTruthy();
    expect(screen.getByText('No server configured.')).toBeTruthy();
  });

  test('shows error message on failure', () => {
    mockState = { type: 'Error', message: 'Connection refused' };
    render(<HomeScreen />);
    expect(screen.getByTestId('error-screen')).toBeTruthy();
    expect(screen.getByText('Connection refused')).toBeTruthy();
  });

  test('calls load on mount', () => {
    mockState = { type: 'Loading' };
    render(<HomeScreen />);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
