import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';

interface CoverArtProps {
  uri?: string;
  size: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function CoverArt({ uri, size, style, borderRadius = 4 }: CoverArtProps) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius }, style as any]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
      />
    );
  }

  return (
    <View
      style={[styles.placeholder, { width: size, height: size, borderRadius }, style]}
    >
      <Text style={{ fontSize: size * 0.35, color: '#555' }}>♪</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#2a2a3e',
  },
  placeholder: {
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
