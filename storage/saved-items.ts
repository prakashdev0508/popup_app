import AsyncStorage from '@react-native-async-storage/async-storage';

import { Overlay, type SavedItem } from '@/native/overlay';

const STORAGE_KEY = 'saved_items_v1';

function sanitize(items: SavedItem[]): SavedItem[] {
  // Enforce max 50 + strip empties.
  const cleaned = items
    .map((x) => ({
      id: String(x.id ?? ''),
      label: String(x.label ?? '').trim(),
      value: String(x.value ?? '').trim(),
    }))
    .filter((x) => x.label !== '' || x.value !== '');

  return cleaned.slice(0, 50);
}

export async function loadSavedItems(): Promise<SavedItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // Fall back to native storage (used by overlay service) so first run can hydrate.
    const fromNative = await Overlay.getItems();
    const cleaned = sanitize(fromNative);
    if (cleaned.length) {
      await saveSavedItems(cleaned);
    }
    return cleaned;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sanitize(parsed as SavedItem[]);
  } catch {
    return [];
  }
}

export async function saveSavedItems(items: SavedItem[]): Promise<void> {
  const cleaned = sanitize(items);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  // Keep native overlay store in sync so the bubble can work even when app is background/killed.
  await Overlay.setItems(cleaned);
}

