import { NativeModules, Platform } from 'react-native';

export type SavedItem = {
  id: string;
  label: string;
  value: string;
};

type OverlayNativeModule = {
  checkOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): void;
  startOverlay(): Promise<boolean>;
  stopOverlay(): Promise<boolean>;
  getItems(): Promise<string>;
  setItems(itemsJson: string): Promise<boolean>;
};

const Native: OverlayNativeModule | undefined = NativeModules.OverlayModule;

function getNativeOrNull(): OverlayNativeModule | null {
  if (Platform.OS !== 'android') return null;
  return Native ?? null;
}

export const Overlay = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!Native;
  },
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const mod = getNativeOrNull();
    if (!mod) return false;
    return mod.checkOverlayPermission();
  },
  requestPermission(): void {
    if (Platform.OS !== 'android') return;
    const mod = getNativeOrNull();
    if (!mod) return;
    mod.requestOverlayPermission();
  },
  async start(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const mod = getNativeOrNull();
    if (!mod) return false;
    return mod.startOverlay();
  },
  async stop(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const mod = getNativeOrNull();
    if (!mod) return false;
    return mod.stopOverlay();
  },
  async getItems(): Promise<SavedItem[]> {
    if (Platform.OS !== 'android') return [];
    const mod = getNativeOrNull();
    if (!mod) return [];
    const raw = await mod.getItems();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x) => {
          const obj = x as Partial<SavedItem>;
          return {
            id: typeof obj.id === 'string' ? obj.id : String(Date.now()),
            label: typeof obj.label === 'string' ? obj.label : '',
            value: typeof obj.value === 'string' ? obj.value : '',
          };
        })
        .filter((x) => x.label.trim() !== '' || x.value.trim() !== '');
    } catch {
      return [];
    }
  },
  async setItems(items: SavedItem[]): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    const mod = getNativeOrNull();
    if (!mod) return false;
    return mod.setItems(JSON.stringify(items));
  },
};

