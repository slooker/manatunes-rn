import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlaylistStore } from '@store/usePlaylistStore';
import { useRepository } from '@hooks/useRepository';
import { useNoServerRedirect } from '@hooks/useNoServerRedirect';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorScreen } from '@components/ErrorScreen';
import { NoServerScreen } from '@components/NoServerScreen';
import { MiniPlayer } from '@components/MiniPlayer';

export default function PlaylistsScreen() {
  const navigation = useNavigation<any>();
  const client = useRepository();
  const { hasNoServers, goToServers } = useNoServerRedirect(navigation);
  const { playlists, createPlaylist, deletePlaylist, syncFromServer } = usePlaylistStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => {
    if (!client) return;
    setLoading(true);
    setError(null);
    syncFromServer(client)
      .then(() => setLoading(false))
      .catch((e: Error) => {
        setLoading(false);
        setError(e.message);
      });
  }, [client, syncFromServer]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim() || !client) return;
    const name = newName.trim();
    setNewName('');
    setCreating(false);
    try {
      await createPlaylist(client, name);
    } catch (e) {
      Alert.alert('Create playlist failed', (e as Error).message);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!client) return;
          try {
            await deletePlaylist(client, id);
          } catch (e) {
            Alert.alert('Delete playlist failed', (e as Error).message);
          }
        },
      },
    ]);
  };

  if (hasNoServers) return <NoServerScreen onAddServer={goToServers} />;
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>No playlists yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('PlaylistDetail', { playlistId: item.id, playlistName: item.name })}
            onLongPress={() => handleDelete(item.id, item.name)}
          >
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.count}>{item.songCount ?? 0} songs</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setCreating(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <Modal visible={creating} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor="#666"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreating(false)}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  list: { paddingBottom: 80 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 16 },
  count: { color: '#888', fontSize: 13, marginTop: 2 },
  chevron: { color: '#555', fontSize: 22 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    backgroundColor: '#6650a4',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#1e1e30', borderRadius: 12, padding: 24, width: '80%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#2a2a3e',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  cancelBtn: { color: '#aaa', fontSize: 16, padding: 8 },
  createBtn: { backgroundColor: '#6650a4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
