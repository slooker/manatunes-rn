import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Linking, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavidromeClient } from '@hooks/useRepository';
import { useNoServerRedirect } from '@hooks/useNoServerRedirect';
import { useScrobbleStore } from '@store/useScrobbleStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { NoServerScreen } from '@components/NoServerScreen';

export default function ScrobblingScreen() {
  const navigation = useNavigation<any>();
  const { hasNoServers, goToServers } = useNoServerRedirect(navigation);
  const client = useNavidromeClient();
  const { listenBrainzLinked, reportingEnabled, setReportingEnabled, checkListenBrainzStatus, linkListenBrainz, unlinkListenBrainz } =
    useScrobbleStore();
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!client) return;
    setChecking(true);
    checkListenBrainzStatus(client)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [client]);

  const handleLink = async () => {
    if (!client || !token.trim()) return;
    setBusy(true);
    try {
      await linkListenBrainz(client, token.trim());
      setToken('');
    } catch (e) {
      Alert.alert('Connect failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!client) return;
    setBusy(true);
    try {
      await unlinkListenBrainz(client);
    } catch (e) {
      Alert.alert('Disconnect failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (hasNoServers) return <NoServerScreen onAddServer={goToServers} />;
  if (checking) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Playback Reporting</Text>
          <Text style={styles.cardSubtitle}>
            Reports plays to Navidrome, driving its play counts and any scrobbler you've connected below.
          </Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Report plays to Navidrome</Text>
            <Switch value={reportingEnabled} onValueChange={setReportingEnabled} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ListenBrainz</Text>
          <Text style={styles.cardSubtitle}>
            Connect your ListenBrainz account to scrobble plays there automatically.
          </Text>

          {listenBrainzLinked ? (
            <>
              <Text style={styles.connected}>✓ Connected</Text>
              <TouchableOpacity style={styles.button} onPress={handleUnlink} disabled={busy}>
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="ListenBrainz user token"
                placeholderTextColor="#666"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.button} onPress={handleLink} disabled={busy || !token.trim()}>
                <Text style={styles.buttonText}>Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('https://listenbrainz.org/profile/')}>
                <Text style={styles.link}>Get your token from listenbrainz.org →</Text>
              </TouchableOpacity>
            </>
          )}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#ccc', fontSize: 15, fontWeight: '600', flex: 1, marginRight: 12 },
  connected: { color: '#7CD992', fontSize: 15, fontWeight: '600' },
  input: {
    backgroundColor: '#2a2a3e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#6650a4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  link: { color: '#D0BCFF', fontSize: 13 },
});
