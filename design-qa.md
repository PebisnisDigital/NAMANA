# PESONAFLIX Digital Identity Flip — Design QA

**Final result: passed for card-sized desktop preview; mobile physical-device QA pending**

## Evidence

- Source visual truth: `/workspace/scratch/f1f0427e572e/upload/ktp-3556918652.jpg` (720 × 450 px photographic reference; card region approximately 590 × 355 px).
- Current implementation: `https://pesonaflix-cinematic-replica-lgt0cipql-jualdigital.vercel.app/` (staging deployment `dpl_Af1ZG5NcYWfVtE9kbrocCqMuxrUY`, branch `card-both-sides-preview`). Earlier full-screen-back preview: `dpl_5ALhFkxow3Xegq6duTwEozBJttJx`.
- Implementation screenshot evidence: browser tab 3 screenshots captured in the live test on 2026-11-06; both faces displayed. Browser viewport: 1363 × 936 CSS px. Browser DOM measurements confirmed **both card faces are exactly 780 × 488 CSS px** at this viewport.
- Comparison basis: compare the card region of the desktop screenshot with the supplied photographic card, normalized by the card's ~1.6:1 aspect ratio. A pixel-by-pixel match is intentionally out of scope: the user requested a PESONAFLIX digital card *inspired by* the KTP reference, not an official ID replica.
- The source card includes an official state emblem and official wording. The prototype intentionally uses generated abstract heraldic art, PESONAFLIX wording and **BUKAN DOKUMEN RESMI** marking.

## Five fidelity surfaces

1. Typography: bold dark serif heading and secondary administrative-style uppercase labels reference the original hierarchy. Generated texture contains no embedded text; all labels are responsive HTML.
2. Spacing/layout: centered compact 1.6:1 card with rounded corners; crest at upper-left, title at upper-middle/right, map below and iridescent strip at bottom. **The reverse uses the exact same card-sized stage**, not a full-screen website.
3. Colors/tokens: security-pattern blue base, rich green Indonesia map, metallic gold decorative crest, holographic rose-purple band, dark outer theater background.
4. Image quality: the front illustration is a new ~242 KB WebP generated for the prototype, not a stretched copy of the supplied 720px image. The original upstream MP4 is reused, cropped to fill the reverse card; the oversized original hero and watermark are not rendered as separate full-screen elements.
5. Copy/content: deliberately uses **Kartu Identitas Digital / PESONAFLIX** and not Indonesian government identity wording; labels explain this is not an official document.

## Interactions checked

- Initial card/front screen opens and renders in the cloud browser.
- **MASUK** activates an accessible loading state.
- After loading, the **card-only 3D flip** reveals a compact cinematic hero assembled from the original title and its playing video. Browser `video.readyState` was 4.
- **BALIK KARTU** returns to the front, restoring the clickable card and entry button.
- The browser console showed no app-originated errors; logs were limited to browser-extension metadata and Vercel sign-in/Google One Tap from the earlier protected-page redirect.
- Vercel build: READY. Local `npm run build`: passed; `npm run lint`: one pre-existing warning in unused `ScrollStack.tsx`.

## Findings and accepted gaps

- **P3 / Placeholder branding**: the cinematic back retains upstream name LOHITHA and job-title copy as a concept placeholder. Replace with the final identity's information when selected.
- **P3 / Mobile visual QA**: mobile layout is implemented using a 700px breakpoint, but the connected cloud browser did not advertise a mobile viewport override. A real-phone review remains recommended before a public launch.
- **Local preview unavailable**: the local Vite dev server failed to enumerate network interfaces in the execution container; the separate Vercel staging deployment was used for browser-based verification instead.

## Comparison history

- Iteration 1: generated front-card artwork placed behind HTML headings. Browser screenshot confirmed a card proportion, map, foil band and title visually consistent with the supplied reference.
- Iteration 2: replaced full-screen reverse HeroSection with an original-video cinematic composition contained entirely inside an identically sized card.
- Iteration 3: first browser run exposed a P1 3D compositing bug: `filter: drop-shadow` flattened the flipping parent, showing a mirrored front despite reverse-side content in the accessibility tree. Removed the filter, applied shadows to each face, redeployed, and confirmed the reverse video/text appears correctly in the live screenshot.
- Final screenshot confirms both sides are 780 × 488 px, return action works, no page-scale flip remains.

## Follow-up polish

- Replace LOHITHA/placeholder CTAs when a final identity is selected.
- Check a real smartphone and tune the video crop and small microprint if necessary.
- Decide whether to publish beyond the protected preview stage.
