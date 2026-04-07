// Jest mock for react-native-track-player
const TrackPlayer = {
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  skip: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  setVolume: jest.fn().mockResolvedValue(undefined),
  setRepeatMode: jest.fn().mockResolvedValue(undefined),
  move: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  getQueue: jest.fn().mockResolvedValue([]),
  getActiveTrack: jest.fn().mockResolvedValue(null),
  getActiveTrackIndex: jest.fn().mockResolvedValue(0),
  getTrack: jest.fn().mockResolvedValue(null),
  getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 0, buffered: 0 }),
  registerPlaybackService: jest.fn(),
  addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
};

export default TrackPlayer;

export enum Event {
  PlaybackState = 'playback-state',
  PlaybackTrackChanged = 'playback-track-changed',
  PlaybackQueueEnded = 'playback-queue-ended',
  PlaybackProgressUpdated = 'playback-progress-updated',
  RemotePlay = 'remote-play',
  RemotePause = 'remote-pause',
  RemoteStop = 'remote-stop',
  RemoteNext = 'remote-next',
  RemotePrevious = 'remote-previous',
  RemoteSeek = 'remote-seek',
  RemoteDuck = 'remote-duck',
}

export enum State {
  None = 'none',
  Stopped = 'stopped',
  Paused = 'paused',
  Playing = 'playing',
  Buffering = 'buffering',
  Loading = 'loading',
}

export enum RepeatMode {
  Off = 0,
  Track = 1,
  Queue = 2,
}

export enum Capability {
  Play = 0,
  Pause = 1,
  Stop = 2,
  SeekTo = 3,
  SkipToNext = 4,
  SkipToPrevious = 5,
}

export const useTrackPlayerEvents = jest.fn();
