import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { SavedItem } from '@/native/overlay';
import { loadSavedItems, saveSavedItems } from '@/storage/saved-items';

export default function OverlayPickerScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const loaded = await loadSavedItems();
      if (!alive) return;
      setItems(loaded);
      // Ensure native overlay store stays up to date.
      await saveSavedItems(loaded);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/data');
  }, [router]);

  const pick = useCallback(
    async (item: SavedItem) => {
      await Clipboard.setStringAsync(item.value ?? '');
      ToastAndroid.show(`Copied: ${item.label || 'value'}`, ToastAndroid.SHORT);
      close();
    },
    [close]
  );

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.backdropPressable} onPress={close} />
      <ThemedView style={styles.sheet}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Pick an item to copy</ThemedText>
          <Pressable onPress={close} style={styles.closeBtn}>
            <ThemedText style={styles.closeText}>Close</ThemedText>
          </Pressable>
        </View>

        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText style={styles.muted}>
              No items saved yet. Add items in the Data tab, then tap the bubble again.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => void pick(item)} style={styles.item}>
              <ThemedText type="defaultSemiBold">{item.label || '(no label)'}</ThemedText>
              <ThemedText style={styles.muted} numberOfLines={1}>
                {item.value}
              </ThemedText>
            </Pressable>
          )}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 12,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.18)',
  },
  closeText: {
    opacity: 0.85,
  },
  list: {
    gap: 10,
    paddingBottom: 8,
  },
  item: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.15)',
    gap: 4,
  },
  muted: {
    opacity: 0.75,
  },
});

