import { Preset } from '../types';

export const LIGHTROOM_PRESETS: Preset[] = [
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
  },
];
