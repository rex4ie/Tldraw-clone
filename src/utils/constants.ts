import { StrokeSize, FontFamily, FillStyle, DashStyle, TextAlign } from '../types/canvas';

export const COLORS = [
  { id: 'black', label: 'Black/Dark', value: '#1e1e1e', lightValue: '#1e1e1e', darkValue: '#f4f4f5' },
  { id: 'grey', label: 'Grey', value: '#71717a', lightValue: '#71717a', darkValue: '#a1a1aa' },
  { id: 'violet', label: 'Violet', value: '#8b5cf6', lightValue: '#8b5cf6', darkValue: '#a78bfa' },
  { id: 'blue', label: 'Blue', value: '#3b82f6', lightValue: '#3b82f6', darkValue: '#60a5fa' },
  { id: 'cyan', label: 'Cyan', value: '#06b6d4', lightValue: '#06b6d4', darkValue: '#22d3ee' },
  { id: 'teal', label: 'Teal/Green', value: '#10b981', lightValue: '#10b981', darkValue: '#34d399' },
  { id: 'yellow', label: 'Yellow', value: '#f59e0b', lightValue: '#f59e0b', darkValue: '#fbbf24' },
  { id: 'orange', label: 'Orange', value: '#f97316', lightValue: '#f97316', darkValue: '#fb923c' },
  { id: 'red', label: 'Red', value: '#ef4444', lightValue: '#ef4444', darkValue: '#f87171' },
  { id: 'pink', label: 'Pink', value: '#ec4899', lightValue: '#ec4899', darkValue: '#f472b6' },
  { id: 'white', label: 'White', value: '#ffffff', lightValue: '#ffffff', darkValue: '#ffffff' },
];

export const STROKE_SIZES: Record<StrokeSize, { strokeWidth: number; fontSize: number }> = {
  s: { strokeWidth: 2, fontSize: 16 },
  m: { strokeWidth: 4, fontSize: 24 },
  l: { strokeWidth: 7, fontSize: 36 },
  xl: { strokeWidth: 12, fontSize: 52 },
};

export const STICKY_COLORS = [
  { name: 'yellow', bg: '#fef08a', text: '#713f12', border: '#fde047' },
  { name: 'cyan', bg: '#bae6fd', text: '#0369a1', border: '#7dd3fc' },
  { name: 'green', bg: '#bbf7d0', text: '#15803d', border: '#86efac' },
  { name: 'pink', bg: '#fbcfe8', text: '#9d174d', border: '#f472b6' },
  { name: 'purple', bg: '#ddd6fe', text: '#5b21b6', border: '#c4b5fd' },
  { name: 'orange', bg: '#fed7aa', text: '#9a3412', border: '#fdba74' },
  { name: 'white', bg: '#ffffff', text: '#1e293b', border: '#e2e8f0' },
];

export const DEFAULT_STYLE = {
  color: '#f4f4f5',
  fill: 'none' as FillStyle,
  dash: 'draw' as DashStyle,
  size: 'm' as StrokeSize,
  font: 'vazir' as FontFamily,
  textAlign: 'left' as TextAlign,
  textDirection: 'ltr' as const,
  opacity: 1,
};

export const INITIAL_PAGES = [
  {
    id: 'page-1',
    name: 'Page 1',
    shapes: [],
  },
];
