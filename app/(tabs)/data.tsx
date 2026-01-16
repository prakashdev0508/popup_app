import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    PermissionsAndroid,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Overlay, type SavedItem } from '@/native/overlay';
import { loadSavedItems, saveSavedItems } from '@/storage/saved-items';

function newId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function ensurePostNotificationsPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (Platform.Version < 33) return;
  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (already) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // ignore
  }
}

export default function DataScreen() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [permission, setPermission] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  const editItem = useMemo(
    () => (editId ? items.find((x) => x.id === editId) ?? null : null),
    [editId, items]
  );

  const refreshPermission = useCallback(async () => {
    const can = await Overlay.checkPermission();
    setPermission(can);
  }, []);

  const load = useCallback(async () => {
    const loaded = await loadSavedItems();
    setItems(loaded);
  }, []);

  useEffect(() => {
    void refreshPermission();
    void load();
  }, [load, refreshPermission]);

  const persist = useCallback(
    async (next: SavedItem[]) => {
      setItems(next);
      await saveSavedItems(next);
    },
    [setItems]
  );

  const openAdd = useCallback(() => {
    if (items.length >= 50) {
      Alert.alert('Limit reached', 'You can store up to 50 items.');
      return;
    }
    setEditId(null);
    setLabel('');
    setValue('');
    setIsEditorOpen(true);
  }, [items.length]);

  const openEdit = useCallback((item: SavedItem) => {
    setEditId(item.id);
    setLabel(item.label);
    setValue(item.value);
    setIsEditorOpen(true);
  }, []);

  const remove = useCallback(
    (item: SavedItem) => {
      Alert.alert('Delete item?', `${item.label || item.value}`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void persist(items.filter((x) => x.id !== item.id));
          },
        },
      ]);
    },
    [items, persist]
  );

  const save = useCallback(async () => {
    const nextLabel = label.trim();
    const nextValue = value.trim();
    if (!nextLabel && !nextValue) {
      Alert.alert('Missing data', 'Enter a label or a value.');
      return;
    }

    const next: SavedItem = {
      id: editId ?? newId(),
      label: nextLabel,
      value: nextValue,
    };

    const updated = editId
      ? items.map((x) => (x.id === editId ? next : x))
      : [next, ...items];

    await persist(updated);
    setIsEditorOpen(false);
  }, [editId, items, label, persist, value]);

  const startBubble = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (!Overlay.isAvailable()) {
      Alert.alert(
        'Rebuild required',
        'The overlay feature needs a native Android build (not Expo Go). Run: npx expo run:android'
      );
      return;
    }
    await ensurePostNotificationsPermission();
    if (Platform.Version >= 33) {
      const notifGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (!notifGranted) {
        Alert.alert(
          'Notification permission required',
          'Allow notifications so the floating bubble can run as a foreground service. After granting, tap Start bubble again.'
        );
        return;
      }
    }
    const canDraw = await Overlay.checkPermission();
    setPermission(canDraw);
    if (!canDraw) {
      Alert.alert(
        'Permission required',
        'Enable "Display over other apps" for this app, then come back and tap Start again.'
      );
      Overlay.requestPermission();
      return;
    }
    await Overlay.start();
    Alert.alert('Enabled', 'The floating bubble should now appear on top of other apps.');
  }, []);

  const stopBubble = useCallback(async () => {
    await Overlay.stop();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Saved Data</ThemedText>
      <ThemedText style={styles.muted}>
        Add up to 50 items. When you tap the floating bubble over any app, a picker opens; selecting
        an item copies its value to the clipboard.
      </ThemedText>

      <ThemedView style={styles.panel}>
        <ThemedText type="subtitle">Floating bubble (Android)</ThemedText>
        {Platform.OS === 'android' && !Overlay.isAvailable() ? (
          <ThemedText style={styles.warning}>
            Native overlay module not loaded. You are likely running in Expo Go. Build/install a dev
            client with <ThemedText type="defaultSemiBold">npx expo run:android</ThemedText>.
          </ThemedText>
        ) : null}
        {Platform.OS === 'android' && Platform.Version >= 33 ? (
          <ThemedText style={styles.muted}>
            Note: Android 13+ requires notification permission for the bubble to run.
          </ThemedText>
        ) : null}
        <ThemedText style={styles.muted}>
          Overlay permission: <ThemedText type="defaultSemiBold">{permission ? 'Granted' : 'Not granted'}</ThemedText>
        </ThemedText>

        <View style={styles.row}>
          <Pressable onPress={() => void startBubble()} style={[styles.btn, styles.primary]}>
            <ThemedText style={styles.btnText}>Start bubble</ThemedText>
          </Pressable>
          <Pressable onPress={() => void stopBubble()} style={[styles.btn, styles.secondary]}>
            <ThemedText style={styles.btnText}>Stop</ThemedText>
          </Pressable>
          <Pressable onPress={() => void refreshPermission()} style={[styles.btn, styles.secondary]}>
            <ThemedText style={styles.btnText}>Refresh</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <View style={styles.row}>
        <Pressable onPress={openAdd} style={[styles.btn, styles.primary]}>
          <ThemedText style={styles.btnText}>Add item</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <ThemedText style={styles.muted}>
            No items yet. Add one, then use the floating bubble to copy/paste into other apps.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)} style={styles.item}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.label || '(no label)'}</ThemedText>
              <ThemedText style={styles.muted} numberOfLines={1}>
                {item.value}
              </ThemedText>
            </View>
            <Pressable onPress={() => remove(item)} style={[styles.smallBtn, styles.danger]}>
              <ThemedText style={styles.smallBtnText}>Delete</ThemedText>
            </Pressable>
          </Pressable>
        )}
      />

      <Modal visible={isEditorOpen} transparent animationType="slide" onRequestClose={() => setIsEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ThemedText type="subtitle">{editItem ? 'Edit item' : 'Add item'}</ThemedText>

            <ThemedText style={styles.label}>Label</ThemedText>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Phone number"
              style={styles.input}
              placeholderTextColor="#888"
            />

            <ThemedText style={styles.label}>Value (copied to clipboard)</ThemedText>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="e.g. +91 98765 43210"
              style={styles.input}
              placeholderTextColor="#888"
            />

            <View style={styles.row}>
              <Pressable onPress={() => setIsEditorOpen(false)} style={[styles.btn, styles.secondary]}>
                <ThemedText style={styles.btnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={() => void save()} style={[styles.btn, styles.primary]}>
                <ThemedText style={styles.btnText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  panel: {
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  muted: {
    opacity: 0.75,
  },
  warning: {
    color: '#B00020',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primary: {
    backgroundColor: '#1E88E5',
  },
  secondary: {
    backgroundColor: '#444',
  },
  danger: {
    backgroundColor: '#B00020',
  },
  btnText: {
    color: 'white',
  },
  listContent: {
    gap: 10,
    paddingVertical: 6,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnText: {
    color: 'white',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'white',
    gap: 10,
  },
  label: {
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111',
  },
});

