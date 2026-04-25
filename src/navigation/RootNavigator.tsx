import React, { useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Analytics } from '@services/Analytics';

import { BottomTabNavigator } from './BottomTabNavigator';
import type { RootStackParamList, DrawerParamList } from './types';

import HomeScreen from '@screens/HomeScreen';
import PlaylistsScreen from '@screens/PlaylistsScreen';
import GenresScreen from '@screens/GenresScreen';
import DownloadsScreen from '@screens/DownloadsScreen';
import ServerSettingsScreen from '@screens/ServerSettingsScreen';
import AudioSettingsScreen from '@screens/AudioSettingsScreen';
import AboutScreen from '@screens/AboutScreen';
import HelpScreen from '@screens/HelpScreen';
import SearchScreen from '@screens/SearchScreen';
import ArtistDetailScreen from '@screens/ArtistDetailScreen';
import AlbumDetailScreen from '@screens/AlbumDetailScreen';
import PlaylistDetailScreen from '@screens/PlaylistDetailScreen';
import NowPlayingScreen from '@screens/NowPlayingScreen';
import QueueScreen from '@screens/QueueScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const HEADER_STYLE = { backgroundColor: '#1a1a2e' };
const HEADER_TINT = '#fff';
const STATUS_BAR_OPTIONS = {
  statusBarColor: '#1a1a2e',
  statusBarStyle: 'light' as const,
  statusBarTranslucent: false,
};

function HamburgerButton() {
  const nav = useNavigation<any>();
  return (
    <TouchableOpacity onPress={() => nav.openDrawer()} style={styles.hamburger}>
      <Text style={styles.hamburgerIcon}>☰</Text>
    </TouchableOpacity>
  );
}

function SearchButton() {
  const nav = useNavigation<any>();
  return (
    <TouchableOpacity onPress={() => nav.navigate('Search')} style={styles.searchBtn}>
      <Text style={styles.searchIcon}>🔍</Text>
    </TouchableOpacity>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: HEADER_STYLE,
        headerTintColor: HEADER_TINT,
        ...STATUS_BAR_OPTIONS,
        headerLeft: () => <HamburgerButton />,
        headerRight: () => <SearchButton />,
        drawerStyle: { backgroundColor: '#1a1a2e' },
        drawerActiveTintColor: '#D0BCFF',
        drawerInactiveTintColor: '#aaa',
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ title: 'ManaTunes', drawerLabel: 'Home', drawerIcon: ({ color }) => <Text style={{ color }}>🏠</Text> }}
      />
      <Drawer.Screen
        name="Playlists"
        component={PlaylistsScreen}
        options={{ drawerIcon: ({ color }) => <Text style={{ color }}>📋</Text> }}
      />
      <Drawer.Screen
        name="Genres"
        component={GenresScreen}
        options={{ drawerIcon: ({ color }) => <Text style={{ color }}>🎸</Text> }}
      />
      <Drawer.Screen
        name="Servers"
        component={ServerSettingsScreen}
        options={{ title: 'Servers', drawerIcon: ({ color }) => <Text style={{ color }}>🖥️</Text> }}
      />
      <Drawer.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{ drawerIcon: ({ color }) => <Text style={{ color }}>⬇️</Text> }}
      />
      <Drawer.Screen
        name="AudioSettings"
        component={AudioSettingsScreen}
        options={{ title: 'Audio Settings', drawerIcon: ({ color }) => <Text style={{ color }}>🎚️</Text> }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{ drawerIcon: ({ color }) => <Text style={{ color }}>ℹ️</Text> }}
      />
      <Drawer.Screen
        name="Help"
        component={HelpScreen}
        options={{ drawerIcon: ({ color }) => <Text style={{ color }}>❓</Text> }}
      />
    </Drawer.Navigator>
  );
}

export function RootNavigator() {
  const navigationRef = useNavigationContainerRef();
  const prevRouteRef = useRef<string | undefined>();

  function handleStateChange() {
    const route = navigationRef.getCurrentRoute();
    if (!route || route.name === prevRouteRef.current) return;
    prevRouteRef.current = route.name;

    Analytics.screen(route.name);

    const p = route.params as Record<string, string> | undefined;
    if (route.name === 'ArtistDetail' && p) {
      Analytics.openArtist(p.artistId, p.artistName);
    } else if (route.name === 'AlbumDetail' && p) {
      Analytics.openAlbum(p.albumId, p.albumName, p.artistName);
    } else if (route.name === 'PlaylistDetail' && p) {
      Analytics.openPlaylist(p.playlistId, p.playlistName);
    }
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => { prevRouteRef.current = navigationRef.getCurrentRoute()?.name; }}
      onStateChange={handleStateChange}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: HEADER_STYLE,
          headerTintColor: HEADER_TINT,
          ...STATUS_BAR_OPTIONS,
        }}
      >
        <Stack.Screen name="Drawer" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
        <Stack.Screen
          name="ArtistDetail"
          component={ArtistDetailScreen}
          options={({ route }) => ({ title: route.params.artistName })}
        />
        <Stack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={({ route }) => ({ title: route.params.albumName })}
        />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={({ route }) => ({ title: route.params.playlistName })}
        />
        <Stack.Screen
          name="NowPlaying"
          component={NowPlayingScreen}
          options={{ title: 'Now Playing' }}
        />
        <Stack.Screen
          name="Queue"
          component={QueueScreen}
          options={{ title: 'Queue', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  hamburger: { marginLeft: 16 },
  hamburgerIcon: { color: '#fff', fontSize: 22 },
  searchBtn: { marginRight: 16 },
  searchIcon: { fontSize: 20 },
});
