import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigatorParamList } from './BottomTabNavigator';

export type DrawerParamList = {
  MainTabs: NavigatorScreenParams<BottomTabNavigatorParamList>;
  Playlists: undefined;
  Genres: undefined;
  Servers: undefined;
  Downloads: undefined;
  About: undefined;
  Help: undefined;
};

export type RootStackParamList = {
  Drawer: NavigatorScreenParams<DrawerParamList>;
  Search: undefined;
  ArtistDetail: { artistId: string; artistName: string };
  AlbumDetail: { albumId: string; albumName: string; artistName?: string };
  PlaylistDetail: { playlistId: string; playlistName: string };
  NowPlaying: undefined;
  Queue: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
