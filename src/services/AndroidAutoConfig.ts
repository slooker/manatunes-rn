import { NativeModules, Platform } from 'react-native';

import type { ServerConfig } from '@store/useServerStore';
import type { DownloadedAlbum } from '@store/useDownloadStore';

type AndroidAutoConfigNative = {
  setActiveServer(
    id: string,
    name: string,
    url: string,
    username: string,
    password: string
  ): void;
  clearActiveServer(): void;
  setDownloadedAlbums(json: string): void;
  setReplayGainMode(mode: string): void;
};

const nativeModule = NativeModules.AndroidAutoConfig as AndroidAutoConfigNative | undefined;

export function syncAndroidAutoServer(config: ServerConfig | null, password?: string | null) {
  if (Platform.OS !== 'android' || !nativeModule) return;

  if (!config || !password) {
    nativeModule.clearActiveServer();
    return;
  }

  nativeModule.setActiveServer(config.id, config.name, config.url, config.username, password);
}

export function syncAndroidAutoDownloads(albums: DownloadedAlbum[]) {
  if (Platform.OS !== 'android' || !nativeModule) return;
  nativeModule.setDownloadedAlbums(JSON.stringify(albums));
}

export function syncAndroidAutoReplayGain(mode: string) {
  if (Platform.OS !== 'android' || !nativeModule) return;
  nativeModule.setReplayGainMode(mode);
}
