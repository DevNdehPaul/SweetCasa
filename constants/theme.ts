/**
 * SweetCasa design tokens — light + dark.
 * Palette derived from what's actually used across the app (audited via a
 * frequency scan of every hex literal in app/ and components/), not a generic
 * default — #7C3AED (primary purple) alone appears 150+ times in the codebase.
 */

import { Platform } from 'react-native';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryDarker: string;
  primaryTint: string;
  primaryTintAlt: string;
  primaryBorder: string;
  primarySoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  textInverse: string;
  background: string;
  backgroundAlt: string;
  card: string;
  cardMuted: string;
  border: string;
  borderLight: string;
  divider: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  overlay: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  tint: string;
  tabBarShadow: string;
}

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    // Brand
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryDarker: '#5B21B6',
    primaryTint: '#F3F0FF',
    primaryTintAlt: '#F5F3FF',
    primaryBorder: '#EDE9FE',
    primarySoft: '#DDD6FE',

    // Text
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Surfaces
    background: '#FAFAFA',
    backgroundAlt: '#FAF8F6',
    card: '#FFFFFF',
    cardMuted: '#F9FAFB',
    border: '#E5E7EB',
    borderLight: '#F0F0F0',
    divider: '#F3F4F6',

    // Semantic
    success: '#16A34A',
    successBg: '#ECFDF5',
    danger: '#DC2626',
    dangerBg: '#FEE2E2',
    warning: '#D97706',
    warningBg: '#FFFBEB',

    overlay: 'rgba(0,0,0,0.45)',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#7C3AED',
    tint: '#7C3AED',
    tabBarShadow: '#7C3AED',
  },
  dark: {
    // Brand — lighter purple for contrast against dark surfaces
    primary: '#9F75FF',
    primaryDark: '#7C3AED',
    primaryDarker: '#6D28D9',
    primaryTint: '#2A2140',
    primaryTintAlt: '#251C3A',
    primaryBorder: '#3D3159',
    primarySoft: '#4C3D73',

    // Text
    text: '#F3F4F6',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textLight: '#6B7280',
    textInverse: '#111827',

    // Surfaces
    background: '#0F0F14',
    backgroundAlt: '#15131C',
    card: '#1C1B24',
    cardMuted: '#242231',
    border: '#2E2C3A',
    borderLight: '#26242F',
    divider: '#26242F',

    // Semantic
    success: '#22C55E',
    successBg: '#0F2A1B',
    danger: '#F87171',
    dangerBg: '#3A1518',
    warning: '#FBBF24',
    warningBg: '#332008',

    overlay: 'rgba(0,0,0,0.65)',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#9F75FF',
    tint: '#9F75FF',
    tabBarShadow: '#000000',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
