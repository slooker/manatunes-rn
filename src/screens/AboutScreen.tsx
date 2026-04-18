import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  icon: string;
  changes: string[];
}

const ICON_MAP: Record<string, string> = {
  car: '🚗',
  star: '⭐',
  update: '🔄',
  new: '🆕',
  fix: '🔧',
  feature: '✨',
  search: '🔍',
};

const FEATURES = [
  { icon: '🚗', title: 'Android Auto Support', description: 'Full in-car browsing and playback' },
  { icon: '📋', title: 'Smart Queue', description: 'Drag-to-reorder with haptic feedback' },
  { icon: '🔍', title: 'Multi-Server', description: 'Secure encrypted server storage' },
  { icon: '⬇️', title: 'Offline Downloads', description: 'Save albums for offline playback' },
];

export default function AboutScreen() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const appVersion =
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    'Unknown';

  useEffect(() => {
    try {
      const data = require('../../assets/changelog.json');
      setChangelog(data.changelog ?? []);
    } catch {
      // No changelog file yet
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App info card */}
      <View style={styles.card}>
        <View style={styles.appHeader}>
          <Text style={styles.appIcon}>♪</Text>
          <View>
            <Text style={styles.appName}>ManaTunes</Text>
            <Text style={styles.appSubtitle}>Subsonic API Client</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>{appVersion}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Package</Text>
          <Text style={styles.infoValue}>us.slooker.manatunes</Text>
        </View>
      </View>

      {/* Features card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Features</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Changelog */}
      {changelog.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Recent Updates</Text>
          {changelog.map((entry, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.changelogHeader}>
                <Text style={styles.changelogIcon}>{ICON_MAP[entry.icon] ?? '🔄'}</Text>
                <View style={styles.changelogMeta}>
                  <Text style={styles.changelogTitle}>{entry.title}</Text>
                  <Text style={styles.changelogVersion}>
                    Version {entry.version} · {entry.date}
                  </Text>
                </View>
              </View>
              {entry.changes.map((change, j) => (
                <View key={j} style={styles.changeRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.changeText}>{change}</Text>
                </View>
              ))}
            </View>
          ))}
        </>
      )}

      {/* Buy Me a Coffee */}
      <TouchableOpacity
        style={styles.coffeeCard}
        onPress={() => Linking.openURL('https://buymeacoffee.com/featurecreeplabs')}
        activeOpacity={0.85}
      >
        <Text style={styles.coffeeText}>
          Hey, I'm Shawn — a solo neurodiverse developer running Feature Creep Labs and building apps I actually use every day.
        </Text>
        <Text style={styles.coffeeText}>
          What started as small ideas turned into tools for mood tracking, music ownership, and better game nights.
        </Text>
        <Text style={styles.coffeeText}>
          If something I've built has helped you, supporting here helps me keep improving them—and yes, probably adding "just one more feature."
        </Text>
        <View style={styles.coffeeLink}>
          <Text style={styles.coffeeIcon}>☕</Text>
          <Text style={styles.coffeeLinkText}>Buy me a Coffee</Text>
        </View>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Created by Feature Creep Labs</Text>
        <Text style={styles.footerText}>Powered by Subsonic API</Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#1e1e30',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appIcon: { fontSize: 48, color: '#D0BCFF' },
  appName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  appSubtitle: { color: '#888', fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#2a2a3e' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { fontSize: 22, width: 28 },
  featureTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  featureDesc: { color: '#888', fontSize: 13 },
  sectionHeader: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 },
  changelogHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  changelogIcon: { fontSize: 22 },
  changelogMeta: { flex: 1 },
  changelogTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  changelogVersion: { color: '#888', fontSize: 13, marginTop: 2 },
  changeRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  bullet: { color: '#D0BCFF', fontWeight: '700', fontSize: 14 },
  changeText: { color: '#ccc', fontSize: 14, flex: 1 },
  coffeeCard: {
    backgroundColor: '#2a1e4a',
    borderRadius: 12,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#6650a4',
  },
  coffeeText: { color: '#d8cef0', fontSize: 14, lineHeight: 21 },
  coffeeLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  coffeeIcon: { fontSize: 20 },
  coffeeLinkText: { color: '#D0BCFF', fontSize: 16, fontWeight: '700' },
  footer: { alignItems: 'center', gap: 4, marginTop: 8 },
  footerText: { color: '#555', fontSize: 12 },
});
