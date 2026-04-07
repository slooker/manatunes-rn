import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NoServerScreenProps {
  onAddServer: () => void;
}

export function NoServerScreen({ onAddServer }: NoServerScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="no-server">
      <Text style={styles.title}>No servers found.</Text>
      <Text style={styles.message}>Please add a server under Menu {'->'} Servers.</Text>
      <TouchableOpacity style={styles.button} onPress={onAddServer}>
        <Text style={styles.buttonText}>Add Server</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#6650a4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
