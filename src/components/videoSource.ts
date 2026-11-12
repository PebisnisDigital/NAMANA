import type { AssetUrls, SiteContent } from "../domain/content";

/** Phone preview inherits the desktop video unless a playable HP URL exists. */
export function videoSourceForViewport(
  background: Pick<SiteContent["background"], "desktopVideoAssetId" | "mobileVideoAssetId">,
  urls: AssetUrls,
  isMobile: boolean,
): string {
  const desktop = (background.desktopVideoAssetId && urls[background.desktopVideoAssetId]) || "";
  const mobile = (background.mobileVideoAssetId && urls[background.mobileVideoAssetId]) || "";
  return isMobile ? (mobile || desktop) : (desktop || mobile);
}
