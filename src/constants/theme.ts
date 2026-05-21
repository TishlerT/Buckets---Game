/**
 * theme.ts — pixel-art palette and typography for BUCKETS.
 *
 * Palette is a curated 16-color set inspired by NES / Game Boy Color era games.
 * Stick to these colors anywhere in the UI to keep the look cohesive.
 */

export const PALETTE = {
  // Background / depth
  black: '#0b0d1a',
  midnight: '#1c1f3a',
  dusk: '#3a2e58',

  // Court / wood
  woodDark: '#7a4a1f',
  woodLight: '#c98c4a',
  lineWhite: '#f4f4f4',

  // Team / accents
  orangeBall: '#ff8b1f',
  orangeShadow: '#b35a0e',
  redHot: '#e74040',
  yellowBright: '#ffd23f',
  greenGo: '#5bd14a',
  blueIce: '#3aa5ff',
  purpleSpace: '#a45cff',

  // Neutrals
  shadow: '#2c2c44',
  fog: '#7a7a8a',
  highlight: '#ffffff',

  // ---------------------------------------------------------------------
  // BUCKETS rebuild palette — pulled directly from Reference Image 2.
  // These are the only colors the playground court / HUD should use.
  // ---------------------------------------------------------------------
  courtAsphalt: '#8B6914',          // court surface, sun-baked asphalt
  courtAsphaltDark: '#6b500e',      // shadow strokes / cracks
  courtAsphaltLight: '#b08d28',     // worn lighter patches
  courtLine: '#F5E6C8',             // painted court lines, slightly yellowed
  courtKeyOrange: '#a8531a',        // free-throw key painted orange
  skyTop: '#1A1A2E',                // dusk overhead
  skyMid: '#C94B1F',                // mid sunset gradient stop
  skyHorizon: '#E8651A',            // burnt orange right at the horizon
  citySilhouette: '#241a36',        // background city buildings
  citySilhouetteAccent: '#3a2a52',  // taller building variation
  treeDark: '#1f2a16',              // tree silhouette
  treeMid: '#2f4022',                // tree highlight
  jerseyBlue: '#1E5BB5',            // player default jersey
  jerseyRed: '#C41E1E',             // defender default jersey
  hudPanel: '#0A0A0A',              // HUD panel background
  hudPanelBorder: '#F5C518',        // HUD panel chunky yellow border
  meterLow: '#CC0000',
  meterMid: '#FF8C00',
  meterHigh: '#00CC44',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/**
 * Limited per-court palettes (≤ 6 sprite-relevant colors each — leaves room
 * for UI overlays without breaking the 16-color budget).
 */
export const COURT_PALETTES = {
  playground: {
    floor: PALETTE.courtAsphalt,
    floorAccent: PALETTE.courtAsphaltDark,
    sky: PALETTE.skyTop,
    skyAccent: PALETTE.skyHorizon,
    line: PALETTE.courtLine,
    accent: PALETTE.yellowBright,
  },
  gym: {
    floor: PALETTE.woodLight,
    floorAccent: PALETTE.woodDark,
    sky: PALETTE.shadow,
    skyAccent: PALETTE.midnight,
    line: PALETTE.lineWhite,
    accent: PALETTE.redHot,
  },
  rooftop: {
    floor: '#5a4a6a',
    floorAccent: '#7a6a8a',
    sky: '#f08a4a',
    skyAccent: '#e74040',
    line: PALETTE.lineWhite,
    accent: PALETTE.yellowBright,
  },
  space: {
    floor: PALETTE.dusk,
    floorAccent: PALETTE.purpleSpace,
    sky: PALETTE.black,
    skyAccent: PALETTE.midnight,
    line: PALETTE.blueIce,
    accent: PALETTE.yellowBright,
  },
} as const;

/**
 * Typography. Press Start 2P is loaded via expo-google-fonts and registered
 * at the App root. Sizes are in "rem-ish" px; pixel font is chunky so values
 * are smaller than typical web type scales.
 */
export const FONT = {
  family: 'PressStart2P_400Regular',
  // sizes
  titleXL: 36, // game title
  titleL: 28,  // screen headlines
  titleM: 20,
  body: 14,
  small: 10,
  tiny: 8,
} as const;

/**
 * Chunky pixel-style border radii are deliberately zero — pixel art has no
 * antialiased rounded corners. Keep everything orthogonal.
 */
export const BORDER = {
  thick: 4,
  thin: 2,
  none: 0,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
