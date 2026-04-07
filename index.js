import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { PlaybackService } from './src/services/PlaybackService';

registerRootComponent(App);
TrackPlayer.registerPlaybackService(() => PlaybackService);
