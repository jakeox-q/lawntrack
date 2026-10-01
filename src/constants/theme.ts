/**
 * Visual direction: calm, outdoor-readable, lawn-green on warm paper.
 * High contrast, large type and big touch targets, because people use this
 * standing in the yard in sunlight, often with dirty hands.
 */
import type { TextStyle } from 'react-native';

export const palette = {
  light: {
    background: '#F5F4EE',
    surface: '#FFFFFF',
    surfaceMuted: '#EBEADF',
    border: '#D6D4C8',
    text: '#141C17',
    textMuted: '#4E5A52',
    primary: '#1D6B3A',
    primaryPressed: '#16552D',
    onPrimary: '#FFFFFF',
    primarySoft: '#DCEBDD',
    accent: '#8A5100',
    accentSoft: '#FBEBC8',
    danger: '#A4241C',
    dangerSoft: '#F8DEDB',
    info: '#1F4F7A',
    infoSoft: '#DCE8F3',
    overlay: 'rgba(20, 28, 23, 0.45)',
  },
  dark: {
    background: '#0D1310',
    surface: '#161F1A',
    surfaceMuted: '#1F2A23',
    border: '#2E3B33',
    text: '#EDF2EE',
    textMuted: '#A9B5AD',
    primary: '#73CF93',
    primaryPressed: '#5DBA7E',
    onPrimary: '#0B1A10',
    primarySoft: '#1E3A28',
    accent: '#F2C35B',
    accentSoft: '#3A2E14',
    danger: '#F4A39C',
    dangerSoft: '#3D1D1A',
    info: '#9CC6EE',
    infoSoft: '#16283A',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type Palette = { [K in keyof typeof palette.light]: string };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

/** Minimum touch target, above both platform guidelines. */
export const TOUCH = 48;

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  headline: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  overline: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
