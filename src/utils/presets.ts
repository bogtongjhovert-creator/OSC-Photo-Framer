import { Preset, EditSettings } from '../types';

export const PRESET_COLOR_PALETTE = [
  '#6366F1', // Indigo
  '#EC4899', // Pink / Rose
  '#F59E0B', // Amber / Gold
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#EF4444', // Red
];

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'default',
    name: 'Default Natural',
    iconName: 'Sun',
    previewColor: '#6366F1',
    settings: {
      exposure: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      temperature: 0,
    },
    isCustom: false,
  },
  {
    id: 'vivid',
    name: 'Vivid Pop',
    iconName: 'Sparkles',
    previewColor: '#EC4899',
    settings: {
      exposure: 8,
      contrast: 22,
      saturation: 35,
      sharpness: 25,
      temperature: 5,
    },
    isCustom: false,
  },
  {
    id: 'warm_vintage',
    name: 'Warm Film',
    iconName: 'Flame',
    previewColor: '#F59E0B',
    settings: {
      exposure: 5,
      contrast: -8,
      saturation: -12,
      sharpness: 10,
      temperature: 38,
    },
    isCustom: false,
  },
  {
    id: 'cool_cinematic',
    name: 'Cool Cinematic',
    iconName: 'Snowflake',
    previewColor: '#06B6D4',
    settings: {
      exposure: 2,
      contrast: 28,
      saturation: 10,
      sharpness: 30,
      temperature: -32,
    },
    isCustom: false,
  },
  {
    id: 'bw_contrast',
    name: 'B&W Contrast',
    iconName: 'Moon',
    previewColor: '#9CA3AF',
    settings: {
      exposure: 10,
      contrast: 40,
      saturation: -100,
      sharpness: 20,
      temperature: 0,
    },
    isCustom: false,
  },
  {
    id: 'soft_pastel',
    name: 'Soft Pastel',
    iconName: 'Feather',
    previewColor: '#A855F7',
    settings: {
      exposure: 15,
      contrast: -20,
      saturation: -18,
      sharpness: -10,
      temperature: 12,
    },
    isCustom: false,
  },
  {
    id: 'moody_matte',
    name: 'Moody Matte',
    iconName: 'Camera',
    previewColor: '#10B981',
    settings: {
      exposure: -5,
      contrast: -15,
      saturation: -10,
      sharpness: 15,
      temperature: -8,
    },
    isCustom: false,
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    iconName: 'SunMedium',
    previewColor: '#F97316',
    settings: {
      exposure: 12,
      contrast: 15,
      saturation: 20,
      sharpness: 15,
      temperature: 45,
    },
    isCustom: false,
  },
];

export const LIGHTROOM_PRESETS = BUILT_IN_PRESETS;

const STORAGE_KEY = 'osc_custom_lightroom_presets_v1';

/**
 * Loads custom user presets from localStorage
 */
export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => ({
        ...p,
        isCustom: true,
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to load custom presets from localStorage:', err);
    return [];
  }
}

/**
 * Saves custom user presets to localStorage
 */
export function saveCustomPresets(presets: Preset[]): void {
  try {
    const customOnly = presets.filter((p) => p.isCustom);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
  } catch (err) {
    console.error('Failed to save custom presets to localStorage:', err);
  }
}

/**
 * Creates a new custom preset from current edit settings
 */
export function createCustomPreset(
  name: string,
  currentSettings: EditSettings,
  previewColor: string = '#6366F1',
  description?: string
): Preset {
  return {
    id: `custom_preset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: name.trim() || 'Custom Preset',
    description: description?.trim(),
    previewColor,
    iconName: 'Sparkles',
    isCustom: true,
    createdAt: Date.now(),
    settings: {
      exposure: currentSettings.exposure,
      contrast: currentSettings.contrast,
      saturation: currentSettings.saturation,
      sharpness: currentSettings.sharpness,
      temperature: currentSettings.temperature,
    },
  };
}

/**
 * Exports all custom presets to a downloadable JSON file
 */
export function exportPresetsToJson(presets: Preset[]): void {
  const customPresets = presets.filter((p) => p.isCustom);
  if (customPresets.length === 0) {
    alert('No custom presets available to export. Create a custom preset first!');
    return;
  }

  const exportData = {
    app: 'OSC AutoFrame Studio',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    presets: customPresets,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OSC_Lightroom_Presets_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports presets from a JSON file string and validates structure
 */
export function parseImportedPresetsJson(jsonString: string): Preset[] {
  try {
    const data = JSON.parse(jsonString);
    let rawList: any[] = [];

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && Array.isArray(data.presets)) {
      rawList = data.presets;
    } else {
      throw new Error('Invalid JSON format: Expected a presets array');
    }

    const validPresets: Preset[] = [];

    rawList.forEach((item) => {
      if (item && typeof item.name === 'string' && item.settings) {
        validPresets.push({
          id: `custom_preset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: item.name.slice(0, 40),
          description: typeof item.description === 'string' ? item.description : undefined,
          previewColor: typeof item.previewColor === 'string' ? item.previewColor : '#6366F1',
          iconName: 'Sparkles',
          isCustom: true,
          createdAt: Date.now(),
          settings: {
            exposure: typeof item.settings.exposure === 'number' ? item.settings.exposure : 0,
            contrast: typeof item.settings.contrast === 'number' ? item.settings.contrast : 0,
            saturation: typeof item.settings.saturation === 'number' ? item.settings.saturation : 0,
            sharpness: typeof item.settings.sharpness === 'number' ? item.settings.sharpness : 0,
            temperature: typeof item.settings.temperature === 'number' ? item.settings.temperature : 0,
          },
        });
      }
    });

    return validPresets;
  } catch (err: any) {
    throw new Error(`Failed to parse preset file: ${err.message || 'Invalid format'}`);
  }
}
