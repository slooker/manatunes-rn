import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import ArtistsScreen from '@screens/ArtistsScreen';
import AlbumsScreen from '@screens/AlbumsScreen';
import FavoritesScreen from '@screens/FavoritesScreen';
import NowPlayingScreen from '@screens/NowPlayingScreen';

export type BottomTabNavigatorParamList = {
  Artists: undefined;
  Albums: undefined;
  Favorites: undefined;
  NowPlaying: undefined;
};

const Tab = createBottomTabNavigator<BottomTabNavigatorParamList>();

function SearchButton() {
  const nav = useNavigation<any>();
  return (
    <TouchableOpacity onPress={() => nav.navigate('Search')} style={{ marginRight: 16 }}>
      <Text style={{ color: '#fff', fontSize: 20 }}>🔍</Text>
    </TouchableOpacity>
  );
}

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a1a2e' },
        tabBarActiveTintColor: '#D0BCFF',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen
        name="Artists"
        component={ArtistsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="Albums"
        component={AlbumsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💿</Text>,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>❤️</Text>,
        }}
      />
      <Tab.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{
          tabBarLabel: 'Now Playing',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎵</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
