import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAudioSettingsStore, ReplayGainMode } from '@store/useAudioSettingsStore';

const REPLAY_GAIN_OPTIONS: { value: ReplayGainMode; label: string; description: string }[] = [
  {
    value: 'off',
    label: 'Off',
    description: 'No volume normalization applied.',
  },
  {
    value: 'track',
    label: 'Track Gain',
    description: 'Normalize each song individually. Best for shuffle and mixed playlists.',
  },
  {
    value: 'album',
    label: 'Album Gain',
    description: 'Normalize per album, preserving relative volume between tracks. Best for listening to full albums.',
  },
];

export default function AudioSettingsScreen() {
  const { replayGainMode, setReplayGainMode } = useAudioSettingsStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ReplayGain</Text>
          <Text style={styles.cardSubtitle}>
            Volume normalization applied server-side by Navidrome. Requires ReplayGain tags in your music files.
          </Text>
          {REPLAY_GAIN_OPTIONS.map((option) => {
            const selected = replayGainMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setReplayGainMode(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.optionDesc}>{option.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#1e1e30',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardSubtitle: { color: '#888', fontSize: 13, lineHeight: 19 },
  option: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 14,
  },
  optionSelected: {
    borderColor: '#6650a4',
    backgroundColor: '#1a1530',
  },
  optionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#D0BCFF' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D0BCFF' },
  optionText: { flex: 1, gap: 3 },
  optionLabel: { color: '#ccc', fontSize: 15, fontWeight: '600' },
  optionLabelSelected: { color: '#fff' },
  optionDesc: { color: '#888', fontSize: 13, lineHeight: 18 },
});
