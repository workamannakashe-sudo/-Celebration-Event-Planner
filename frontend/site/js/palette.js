/**
 * @file frontend/site/js/palette.js
 * @description Per-section palette stops and perceptual OKLab color interpolation.
 * Interpolates {bg, fog, keyLight, accent, fg} and writes them to CSS variables
 * and Three.js background/fog so the 3D scene and DOM remain perfectly in sync.
 */

/**
 * @typedef {Object} PaletteStop
 * @property {number} at       - Scroll progress [0, 1]
 * @property {string} bg       - Hex background
 * @property {string} fog      - Hex fog color
 * @property {string} keyLight - Hex key light color
 * @property {string} accent   - Hex accent color
 * @property {string} fg       - Hex foreground text
 */

export const PALETTE_STOPS = [
  // 0. Intro (Deep Obsidian Space)
  { at: 0.00, bg: '#09090b', fog: '#09090b', keyLight: '#ffffff', accent: '#e8d5b5', fg: '#f4f4f6' },
  // 1. About (Ink)
  { at: 0.08, bg: '#0d0d12', fog: '#0d0d12', keyLight: '#ffffff', accent: '#e8d5b5', fg: '#f4f4f6' },
  // 2. Budget (Deep Violet)
  { at: 0.17, bg: '#160e24', fog: '#160e24', keyLight: '#e9d5ff', accent: '#d8b4fe', fg: '#f8f7ff' },
  // 3. Stress Test (Deep Teal / Risk Cyan)
  { at: 0.25, bg: '#0c1a1d', fog: '#0c1a1d', keyLight: '#ccfbf1', accent: '#5eead4', fg: '#f0fdfa' },
  // 4. Timeline (Warm Amber Horizon)
  { at: 0.33, bg: '#1c150c', fog: '#1c150c', keyLight: '#fef3c7', accent: '#fcd34d', fg: '#fffbeb' },
  // 5. Vendors (Midnight Blue)
  { at: 0.42, bg: '#14141e', fog: '#14141e', keyLight: '#dbeafe', accent: '#93c5fd', fg: '#f0f7ff' },
  // 6. Guests (Deep Botanical Emerald)
  { at: 0.50, bg: '#0e1a14', fog: '#0e1a14', keyLight: '#d1fae5', accent: '#6ee7b7', fg: '#f0fdf4' },
  // 7. Money / Cash Flow (Warm Bronze)
  { at: 0.58, bg: '#1c1510', fog: '#1c1510', keyLight: '#ffedd5', accent: '#fdba74', fg: '#fff7ed' },
  // 8. Day-of (Twilight Violet)
  { at: 0.67, bg: '#16131c', fog: '#16131c', keyLight: '#ede9fe', accent: '#c4b5fd', fg: '#faf5ff' },
  // 9. Exports (Steel Slate)
  { at: 0.75, bg: '#101418', fog: '#101418', keyLight: '#cffafe', accent: '#a5f3fc', fg: '#f0fdfa' },
  // 10. Plans / Work Index (Champagne Ink)
  { at: 0.83, bg: '#0a0a0e', fog: '#0a0a0e', keyLight: '#ffffff', accent: '#e8d5b5', fg: '#f4f4f6' },
  // 11. Marquee (Night Sky)
  { at: 0.92, bg: '#0c0c10', fog: '#0c0c10', keyLight: '#ffffff', accent: '#e8d5b5', fg: '#f4f4f6' },
  // 12. Footer (Obsidian Finale)
  { at: 1.00, bg: '#09090b', fog: '#09090b', keyLight: '#ffffff', accent: '#e8d5b5', fg: '#f4f4f6' },
];

/**
 * Convert standard hex color to linear sRGB [0, 1].
 * @param {string} hex
 * @returns {[number, number, number]}
 */
function hexToLinearSrgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [toLinear(r), toLinear(g), toLinear(b)];
}

/**
 * Convert linear sRGB to OKLab [L, a, b].
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
function srgbToOklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/**
 * Convert OKLab to hex color string.
 * @param {number} L
 * @param {number} a
 * @param {number} b
 * @returns {string}
 */
function oklabToHex(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toGamma = (c) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const toHex2 = (c) => Math.round(toGamma(c) * 255).toString(16).padStart(2, '0');
  return `#${toHex2(rLin)}${toHex2(gLin)}${toHex2(bLin)}`;
}

/**
 * Interpolate two hex colors in OKLab space.
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} t [0, 1]
 * @returns {string}
 */
export function interpolateHexOklab(hex1, hex2, t) {
  if (t <= 0) return hex1;
  if (t >= 1) return hex2;
  const [r1, g1, b1] = hexToLinearSrgb(hex1);
  const [r2, g2, b2] = hexToLinearSrgb(hex2);
  const lab1 = srgbToOklab(r1, g1, b1);
  const lab2 = srgbToOklab(r2, g2, b2);

  const L = lab1[0] + (lab2[0] - lab1[0]) * t;
  const a = lab1[1] + (lab2[1] - lab1[1]) * t;
  const b = lab1[2] + (lab2[2] - lab1[2]) * t;

  return oklabToHex(L, a, b);
}

/**
 * Get interpolated palette state for a given scroll progress [0, 1].
 * @param {number} progress
 * @returns {PaletteStop}
 */
export function getPaletteAt(progress) {
  const p = Math.max(0, Math.min(1, progress));
  let i = 0;
  while (i < PALETTE_STOPS.length - 1 && PALETTE_STOPS[i + 1].at < p) {
    i++;
  }
  const s0 = PALETTE_STOPS[i];
  const s1 = PALETTE_STOPS[Math.min(i + 1, PALETTE_STOPS.length - 1)];

  if (s0 === s1 || s1.at === s0.at) return { ...s0 };

  const localT = (p - s0.at) / (s1.at - s0.at);

  return {
    at: p,
    bg: interpolateHexOklab(s0.bg, s1.bg, localT),
    fog: interpolateHexOklab(s0.fog, s1.fog, localT),
    keyLight: interpolateHexOklab(s0.keyLight, s1.keyLight, localT),
    accent: interpolateHexOklab(s0.accent, s1.accent, localT),
    fg: interpolateHexOklab(s0.fg, s1.fg, localT),
  };
}

/**
 * Write interpolated palette values directly to documentElement CSS custom properties.
 * @param {PaletteStop} palette
 */
export function applyPaletteToDOM(palette) {
  const doc = document.documentElement;
  doc.style.setProperty('--bg', palette.bg);
  doc.style.setProperty('--fg', palette.fg);
  doc.style.setProperty('--accent', palette.accent);
  document.body.style.backgroundColor = palette.bg;
}
