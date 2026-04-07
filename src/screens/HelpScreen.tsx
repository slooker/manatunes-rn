import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HelpItem {
  title: string;
  description: string;
}

interface HelpSection {
  title: string;
  items: HelpItem[];
  badge?: string;
}

const SECTIONS: HelpSection[] = [
  {
    title: 'Playlists',
    items: [
      { title: 'Creating a playlist', description: 'Open the drawer menu and tap Playlists. Tap the + button to create a new playlist and give it a name.' },
      { title: 'Adding songs to a playlist', description: 'Long-press any song in Search, an Album, or Artist detail screen and choose "Add to Playlist".' },
      { title: 'Sharing a playlist', description: 'Long-press a playlist and choose "Share". This generates a shareable link with your song list.' },
      { title: 'Renaming or deleting', description: 'Long-press a playlist to rename or delete it. Deleting a playlist only removes it locally — your server is not affected.' },
    ],
  },
  {
    title: 'Downloads',
    items: [
      { title: 'Downloading a song', description: 'Long-press a song and tap "Download" to save it for offline playback.' },
      { title: 'Downloading an album', description: 'Long-press an album (or from the Album detail screen) and tap "Download Album" to save all tracks.' },
      { title: 'Managing downloads', description: 'Open the drawer menu and tap Downloads. Long-press a downloaded album to delete it from your device.' },
    ],
  },
  {
    title: 'Long Press Actions',
    items: [
      { title: 'Song actions', description: 'Play Next, Add to Queue, Add to Playlist, Download, Favorite/Unfavorite' },
      { title: 'Album actions', description: 'Play Album, Shuffle Album, Add Album to Queue, Download Album' },
      { title: 'Artist actions', description: 'Play Artist, Add Artist to Queue' },
      { title: 'Playlist actions', description: 'Play, Share, Rename, Delete' },
      { title: 'Queue item actions', description: 'Remove from Queue (tap ✕), drag handle to reorder (long-press)' },
    ],
  },
  {
    title: 'Voice Commands (Google Assistant)',
    badge: 'Beta',
    items: [
      { title: 'Beta feature', description: 'Voice commands require Google Assistant app actions to be enabled. Availability may vary by device and region.' },
      { title: 'Play a song', description: '"Hey Google, play [song name] in ManaTunes"' },
      { title: 'Play an artist', description: '"Hey Google, play [artist name] in ManaTunes"' },
      { title: 'Play an album', description: '"Hey Google, play [album name] in ManaTunes"' },
      { title: 'Play by genre', description: '"Hey Google, play random [genre] in ManaTunes"' },
      { title: 'Search', description: '"Hey Google, search for [query] in ManaTunes"' },
    ],
  },
  {
    title: 'Android Auto',
    items: [
      { title: 'Getting started', description: 'Connect your phone to Android Auto in your car. ManaTunes will appear in the media apps list. Tap it to open.' },
      { title: 'Browsing music', description: 'Use the on-screen controls to browse Artists, Albums, and Frequently Played. Tap any album to see its tracks.' },
      { title: 'Playback controls', description: 'Use the steering wheel or in-car controls to play, pause, skip tracks. Voice search is also supported.' },
    ],
  },
  {
    title: 'Filing a Bug',
    items: [
      { title: 'What to include', description: 'Please describe what you were doing, what you expected to happen, and what actually happened. Include your server type (Navidrome, Subsonic, etc.) and Android version if relevant.' },
      { title: 'Where to report', description: 'You can report bugs on GitHub Issues or by email. Tap the buttons below to open.' },
    ],
  },
];

function Section({ section }: { section: HelpSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setExpanded((e) => !e)}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.badge && <View style={styles.badge}><Text style={styles.badgeText}>{section.badge}</Text></View>}
        </View>
        <Text style={styles.chevron}>{expanded ? '▾' : '›'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.items}>
          {section.items.map((item, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
          ))}
          {section.title === 'Filing a Bug' && (
            <View style={styles.bugButtons}>
              <TouchableOpacity
                style={styles.bugBtn}
                onPress={() => Linking.openURL('https://github.com/shawnhank/manatunes/issues')}
              >
                <Text style={styles.bugBtnText}>GitHub Issues</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bugBtn, styles.emailBtn]}
                onPress={() => Linking.openURL('mailto:shawn@featurecreeplabs.com')}
              >
                <Text style={styles.bugBtnText}>Email</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function HelpScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Help & Documentation</Text>
        {SECTIONS.map((section) => (
          <Section key={section.title} section={section} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { padding: 16, paddingBottom: 32 },
  header: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  section: {
    backgroundColor: '#1e1e30',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chevron: { color: '#888', fontSize: 18 },
  badge: { backgroundColor: '#6650a4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  items: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2a2a3e' },
  item: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a3e' },
  itemTitle: { color: '#D0BCFF', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  itemDesc: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  bugButtons: { flexDirection: 'row', gap: 12, padding: 16 },
  bugBtn: { flex: 1, backgroundColor: '#6650a4', padding: 12, borderRadius: 8, alignItems: 'center' },
  emailBtn: { backgroundColor: '#2a2a3e' },
  bugBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
