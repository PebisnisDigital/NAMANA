import type { OriginalStyle } from "../domain/content.js";

export const originalStyleDefaults: OriginalStyle = {
  backgroundColor: "#08080c",
  textColor: "#fff5ed",
  accentColor: "#f34b53",
  buttonColor: "#b5232b",
  buttonTextColor: "#ffffff",
  borderColor: "#b67b78",
  fontFamily: "montserrat",
  titleScale: 1,
  bodyScale: 1,
  roleScale: 1,
  menuScale: 1,
  layoutPreset: "original",
  contentMargin: 90,
  topSpacing: 40,
  factColumns: 3,
  galleryColumns: 2,
  cardGap: 14,
  buttonRadius: 15,
  borderWidth: 1,
  buttonVariant: "solid",
  shadow: "soft",
};

export const originalFontFamilies: Record<OriginalStyle["fontFamily"], string> = {
  montserrat: '"Montserrat", Arial, sans-serif',
  space: '"Space Grotesk", Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  poppins: '"Poppins", Arial, sans-serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
};

export const originalShadowValues: Record<OriginalStyle["shadow"], string> = {
  none: "none",
  soft: "0 10px 24px #0008",
  strong: "0 20px 44px #000b",
};

/** Shared visual presets for both Admin and Partner Studio.
 * Changing a preset never overwrites identity, collections, links or client video.
 */
export type NaminaStylePreset = "original" | "putih";

export const naminaStylePresets: Record<NaminaStylePreset, OriginalStyle> = {
  original: { ...originalStyleDefaults, backgroundColor: "#000000", textColor: "#ffc799",
    accentColor: "#f34b53", buttonColor: "#b5232b", buttonTextColor: "#ffffff",
    borderColor: "#b67b78" },
  putih: { ...originalStyleDefaults, backgroundColor: "#ffffff", textColor: "#141414",
    accentColor: "#d91128", buttonColor: "#d91128", buttonTextColor: "#ffffff",
    borderColor: "#e8a6ae" },
};

export function identifyNaminaStyle(style?: OriginalStyle): NaminaStylePreset {
  if (!style) return "original";
  const color = style.backgroundColor.toLowerCase();
  if (color === "#ffffff" || color === "#fff" || color === "#fefefe") return "putih";
  return "original";
}
