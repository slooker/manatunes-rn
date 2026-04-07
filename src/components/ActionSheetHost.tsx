import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActionSheetStore } from '@store/useActionSheetStore';

export function ActionSheetHost() {
  const insets = useSafeAreaInsets();
  const { title, actions, visible, hideActionSheet } = useActionSheetStore();

  const handlePress = async (action: (typeof actions)[number]) => {
    if (action.disabled) return;
    hideActionSheet();
    await action.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={hideActionSheet}>
      <Pressable style={styles.backdrop} onPress={hideActionSheet}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.action, action.disabled && styles.disabled]}
              onPress={() => handlePress(action)}
              disabled={action.disabled}
            >
              <Text
                style={[
                  styles.actionText,
                  action.destructive && styles.destructive,
                  action.disabled && styles.disabledText,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.action, styles.cancel]} onPress={hideActionSheet}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e1e30',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  title: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'center',
  },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a3e',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  destructive: { color: '#cf6679' },
  disabled: { opacity: 0.45 },
  disabledText: { color: '#888' },
  cancel: {
    marginTop: 8,
    borderTopWidth: 0,
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
  },
  cancelText: {
    color: '#D0BCFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
