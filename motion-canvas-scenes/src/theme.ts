/**
 * Theme loader for Motion Canvas scenes.
 * Reads theme.json from the project root for cross-engine visual consistency.
 */

import themeData from '../../theme.json';

export const theme = {
  colors: themeData.colors,
  fonts: themeData.fonts,
  spacing: themeData.spacing,
  animation: themeData.animation,
  canvas: themeData.canvas,
} as const;

// Convenience accessors
export const colors = theme.colors;
export const fonts = theme.fonts;
export const spacing = theme.spacing;
export const animation = theme.animation;
