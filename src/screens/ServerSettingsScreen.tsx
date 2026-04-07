import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useServerStore, ServerConfig } from '@store/useServerStore';
import { SubsonicClient } from '@api/SubsonicClient';

interface FormState {
  id?: string;
  name: string;
  url: string;
  username: string;
  password: string;
}

const EMPTY_FORM: FormState = { name: '', url: '', username: '', password: '' };

export default function ServerSettingsScreen() {
  const { servers, activeServerId, isLoaded, saveServer, deleteServer, setActiveServer, getPassword, loadFromStorage } =
    useServerStore();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const hasOpenedEmptyServerForm = useRef(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (isLoaded && servers.length === 0 && editing === null && !hasOpenedEmptyServerForm.current) {
      hasOpenedEmptyServerForm.current = true;
      setEditing(EMPTY_FORM);
    }
  }, [editing, isLoaded, servers.length]);

  const handleEdit = async (server: ServerConfig) => {
    const pwd = (await getPassword(server.id)) ?? '';
    setEditing({ id: server.id, name: server.name, url: server.url, username: server.username, password: pwd });
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.url || !editing.username || !editing.password) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    await saveServer(editing, editing.password);
    setEditing(null);
  };

  const handleTest = async () => {
    if (!editing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const client = new SubsonicClient({
        serverUrl: editing.url,
        username: editing.username,
        password: editing.password,
      });
      const result = await client.ping();
      setTestResult(result.ok ? '✓ Connected successfully' : `✗ ${result.isNetworkError ? 'Network error' : result.message}`);
    } catch {
      setTestResult('✗ Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Server', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteServer(id) },
    ]);
  };

  if (editing !== null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.formTitle}>{editing.id ? 'Edit Server' : 'Add Server'}</Text>

        {(['name', 'url', 'username'] as const).map((field) => (
          <View key={field} style={styles.field}>
            <Text style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
            <TextInput
              style={styles.input}
              value={editing[field]}
              onChangeText={(v) => setEditing((e) => e && { ...e, [field]: v })}
              autoCapitalize="none"
              keyboardType={field === 'url' ? 'url' : 'default'}
              placeholder={field === 'url' ? 'https://music.example.com' : ''}
              placeholderTextColor="#555"
            />
          </View>
        ))}

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={editing.password}
            onChangeText={(v) => setEditing((e) => e && { ...e, password: v })}
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        {testResult && (
          <Text style={[styles.testResult, testResult.startsWith('✓') ? styles.ok : styles.err]}>
            {testResult}
          </Text>
        )}

        <TouchableOpacity style={[styles.btn, styles.testBtn]} onPress={handleTest} disabled={testing}>
          <Text style={styles.btnText}>{testing ? 'Testing…' : 'Test Connection'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
          <Text style={styles.btnText}>Save</Text>
        </TouchableOpacity>

          <TouchableOpacity onPress={() => setEditing(null)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={servers}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.empty}>No servers configured</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.serverItem, item.id === activeServerId && styles.activeServer]}
            onPress={() => setActiveServer(item.id)}
            onLongPress={() => handleEdit(item)}
          >
            <View style={styles.serverInfo}>
              <Text style={styles.serverName}>{item.name}</Text>
              <Text style={styles.serverUrl}>{item.url}</Text>
              <Text style={styles.serverUser}>{item.username}</Text>
            </View>
            <View style={styles.serverActions}>
              {item.id === activeServerId && <Text style={styles.active}>✓</Text>}
              <TouchableOpacity onPress={() => handleEdit(item)}>
                <Text style={styles.editBtn}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                <Text style={styles.deleteBtn}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setEditing(EMPTY_FORM)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  form: { padding: 20 },
  formTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1e1e30',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  testResult: { marginVertical: 8, fontSize: 14 },
  ok: { color: '#6fcf97' },
  err: { color: '#cf6679' },
  btn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  testBtn: { backgroundColor: '#2a2a3e' },
  saveBtn: { backgroundColor: '#6650a4' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelLink: { color: '#888', textAlign: 'center', marginTop: 16, fontSize: 15 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  serverItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  activeServer: { backgroundColor: '#1e1a2e' },
  serverInfo: { flex: 1 },
  serverName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  serverUrl: { color: '#888', fontSize: 13, marginTop: 2 },
  serverUser: { color: '#666', fontSize: 12 },
  serverActions: { alignItems: 'flex-end', gap: 8 },
  active: { color: '#D0BCFF', fontSize: 18 },
  editBtn: { color: '#D0BCFF', fontSize: 14 },
  deleteBtn: { color: '#cf6679', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#6650a4',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
