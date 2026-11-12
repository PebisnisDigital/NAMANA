import { z } from "zod";
import { contentSchema, slugSchema, type AssetUrls, type SiteContent } from "../domain/content.js";
import { originalProfileTabs } from "./originalProfileTabs.js";
import { viniOriginal } from "./originalSeed.js";

const mediaUrl = z.string().max(2000).refine((value) => {
  if (!value) return true;
  if (/^\/videos\/[a-zA-Z0-9._-]+$/.test(value)) return true;
  if (/^\/media\/[a-z0-9-]{3,48}\/[a-f0-9]{32}\.(?:png|jpg|webp)$/.test(value)) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, "Gunakan URL HTTPS, misalnya tautan Dropbox dengan raw=1.");

export const siteDocumentSchema = z.object({
  slug: slugSchema,
  content: contentSchema,
  media: z.object({
    desktopVideo: mediaUrl,
    mobileVideo: mediaUrl,
    poster: mediaUrl,
    portrait: mediaUrl,
    enterKey: mediaUrl.optional(),
    cards: z.record(z.string(), mediaUrl),
  }).strict(),
}).strict();

export type SiteDocument = z.infer<typeof siteDocumentSchema>;

export const mediaIds = {
  desktopVideo: "11111111-1111-4111-8111-111111111111",
  mobileVideo: "22222222-2222-4222-8222-222222222222",
  poster: "33333333-3333-4333-8333-333333333333",
  portrait: "44444444-4444-4444-8444-444444444444",
  enterKey: "55555555-5555-4555-8555-555555555555",
};

const originalColors = ["#ef694e", "#e6b65a", "#a4a3f0", "#67b5d6", "#7dca95", "#e4a2c5"];

export const viniSeed: SiteDocument = {
  slug: "vini",
  content: {
    schemaVersion: 1,
    template: "ORIGINAL",
    original: structuredClone(viniOriginal),
    identity: {
      displayName: "TEH VINI",
      profession: "AI ENTHUSIAST",
      introLabel: "Hallo, Kenalin Saya adalah...",
      bio: "Di balik setiap karya, ada cerita yang ingin kubagikan.",
      portraitAssetId: null,
    },
    wallet: { color: "#382c28", materialPreset: "original", animationPreset: "normal" },
    background: {
      desktopVideoAssetId: mediaIds.desktopVideo,
      mobileVideoAssetId: null,
      posterAssetId: mediaIds.poster,
      overlayOpacity: 0.4,
      focalX: 50,
      focalY: 50,
    },
    theme: { accent: "#c9a66b", fontPreset: "original", headingScale: 1 },
    cards: originalProfileTabs.map((tab, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      type: tab.kind === "social" ? "contact" : tab.kind === "work" ? "experience" : "profile",
      title: tab.label,
      subtitle: tab.value,
      description: tab.story,
      visible: true,
      color: originalColors[index % originalColors.length],
      imageAssetId: null,
      icon: tab.icon,
      brandIcon: tab.brandIcon as SiteContent["cards"][number]["brandIcon"],
      kind: tab.kind,
      animatedIcon: tab.animatedIcon,
      link: tab.url || "",
    })),
  },
  media: {
    desktopVideo: "https://www.dropbox.com/scl/fi/g0et9qnfbck0mx7y1wwvf/Person_walking_in_cinematic_studio_bfd986bf_720p-1.mp4?rlkey=m3lseluyujl8gul834ix8hwvj&raw=1",
    mobileVideo: "",
    poster: "",
    portrait: "",
    enterKey: "",
    cards: {},
  },
};

/**
 * NAMINA's official starting point is the complete /vini demo,
 * not a skeleton with empty slide collections. Each new client gets
 * its own independent copy (including menu icons, facts, work, products,
 * colors and preview video) and a unique slug.
 *
 * Do not mutate the source template or the published /vini website.
 */
export function cloneViniTemplate(slug: string, source: SiteDocument = viniSeed): SiteDocument {
  const checkedSlug = slugSchema.parse(slug);
  const site = structuredClone(siteDocumentSchema.parse(source));
  site.slug = checkedSlug;

  // Keep media references connected when duplicating any cards with images.
  const oldCardMedia = site.media.cards;
  const cardMedia: Record<string, string> = {};
  for (const card of site.content.cards) {
    const previous = card.id;
    card.id = crypto.randomUUID();
    if (oldCardMedia[previous]) cardMedia[card.id] = oldCardMedia[previous];
    card.imageAssetId = null;
  }
  const original = site.content.original;
  if (original) {
    for (const key of ["nama", "karir", "skill"] as const) {
      original[key].items = original[key].items.map((item) => ({
        ...item, id: crypto.randomUUID(),
      }));
    }
    for (const key of ["karya", "produk"] as const) {
      original[key].items = original[key].items.map((item) => {
        const previous = item.id;
        const id = crypto.randomUUID();
        if (oldCardMedia[previous]) cardMedia[id] = oldCardMedia[previous];
        return { ...item, id, imageAssetId: null };
      });
    }
  }
  site.media.cards = cardMedia;
  return siteDocumentSchema.parse(prepareSite(site));
}

/**
 * Match the currently published /vini template, including its actual
 * Dropbox video URL and latest icon/cards. Fallback is always populated
 * with rich sample data if the JSON cannot be loaded.
 */
export async function loadViniTemplate(slug: string): Promise<SiteDocument> {
  try {
    const response = await fetch("/clients/vini.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Template original tidak bisa diambil");
    const original = siteDocumentSchema.parse(await response.json());
    return cloneViniTemplate(slug, original);
  } catch {
    return cloneViniTemplate(slug);
  }
}

export function blankSite(slug: string): SiteDocument {
  return cloneViniTemplate(slug);
}

export function resolveMedia(document: SiteDocument): AssetUrls {
  const entries: [string, string][] = [
    [mediaIds.desktopVideo, document.media.desktopVideo],
    [mediaIds.mobileVideo, document.media.mobileVideo],
    [mediaIds.poster, document.media.poster],
    [mediaIds.portrait, document.media.portrait],
    [mediaIds.enterKey, document.media.enterKey || ""],
  ];
  for (const card of document.content.cards) {
    const url = document.media.cards[card.id];
    if (url) entries.push([card.id, url]);
  }
  for (const gallery of [document.content.original?.karya, document.content.original?.produk]) {
    for (const item of gallery?.items || []) {
      const url = document.media.cards[item.id];
      if (url) entries.push([item.id, url]);
    }
  }
  return Object.fromEntries(entries.filter(([, url]) => !!url));
}

export function prepareSite(document: SiteDocument): SiteDocument {
  const site = structuredClone(document);
  site.content.background.desktopVideoAssetId = site.media.desktopVideo ? mediaIds.desktopVideo : null;
  site.content.background.mobileVideoAssetId = site.media.mobileVideo ? mediaIds.mobileVideo : null;
  site.content.background.posterAssetId = site.media.poster ? mediaIds.poster : null;
  site.content.identity.portraitAssetId = site.media.portrait ? mediaIds.portrait : null;
  site.content.theme.enterKeyAssetId = site.media.enterKey ? mediaIds.enterKey : null;
  site.content.cards.forEach((card) => {
    card.imageAssetId = site.media.cards[card.id] ? card.id : null;
  });
  for (const gallery of [site.content.original?.karya, site.content.original?.produk]) {
    gallery?.items.forEach((item) => {
      item.imageAssetId = site.media.cards[item.id] ? item.id : null;
    });
  }
  return site;
}

export function normalizeSite(document: SiteDocument): SiteDocument {
  return siteDocumentSchema.parse(prepareSite(document));
}
