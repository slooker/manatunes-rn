import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function LoadingScreen({ message }: { message?: string }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="loading-indicator">
      <ActivityIndicator size="large" color="#D0BCFF" />
      {message && <Text style={styles.message}>{message}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#aaa',
    marginTop: 12,
    fontSize: 14,
  },
});
