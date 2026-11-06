# PESONAFLIX Digital Identity Flip — Design QA

**Final result: passed**

## Evidence

- Source visual truth (front): `/workspace/scratch/f1f0427e572e/upload/ktp-3556918652.jpg` (720 × 450 px photographic reference; card region approximately 590 × 355 px). Latest source visual truth (back): `/workspace/scratch/f1f0427e572e/upload/image(20261106-023150).png` (839 × 514 px screen crop), annotated red around the original figure at middle-right.
- Current implementation: `https://pesonaflix-cinematic-replica-git-card-both-s-0cbdad-jualdigital.vercel.app/` (stable branch preview alias; staging deployment `dpl_4vs99rfocZKFmcteeMyk2jMVT4NE`, branch `card-both-sides-preview`). Prior card version: `dpl_Af1ZG5NcYWfVtE9kbrocCqMuxrUY`.
- Implementation screenshot evidence: browser tab 4 screenshots captured in the live test on 2026-11-06, before/after flip and during playing-video frames. Browser viewport: 1363 × 936 CSS px, screenshot raster 1363 × 936 px (approximately 1×). Browser DOM measurements confirmed **both card faces are exactly 780 × 488 CSS px** at this viewport.
- Comparison basis: compare the card region of the desktop screenshot with the supplied photographic card, normalized by the card's ~1.6:1 aspect ratio. A pixel-by-pixel match is intentionally out of scope: the user requested a PESONAFLIX digital card *inspired by* the KTP reference, not an official ID replica.
- The source card includes an official state emblem and official wording. The prototype intentionally uses generated abstract heraldic art, PESONAFLIX wording and **BUKAN DOKUMEN RESMI** marking.

## Five fidelity surfaces

1. Typography: bold dark serif heading and secondary administrative-style uppercase labels reference the original hierarchy. Generated texture contains no embedded text; all labels are responsive HTML.
2. Spacing/layout: centered compact 1.6:1 card with rounded corners; crest at upper-left, title at upper-middle/right, map below and iridescent strip at bottom. **The reverse uses the exact same card-sized stage**, not a full-screen website.
3. Colors/tokens: security-pattern blue base, rich green Indonesia map, metallic gold decorative crest, holographic rose-purple band, dark outer theater background.
4. Image quality: the front illustration is a new ~242 KB WebP generated for the prototype, not a stretched copy of the supplied 720px image. The original upstream MP4 is reused, cropped to fill the reverse card. In this revision the video is offset 22% right, brightened to 1.65× with 1.07× contrast, and shielded from the left text with a more concentrated gradient. The figure sits at approximately the 65–75% card region in captured frames, instead of ~40–55%, with face/clothes clearly visible.
5. Copy/content: deliberately uses **Kartu Identitas Digital / PESONAFLIX** and not Indonesian government identity wording; labels explain this is not an official document.

## Interactions checked

- Initial card/front screen opens and renders in the cloud browser.
- **MASUK** activates an accessible loading state.
- After loading, the **card-only 3D flip** reveals a compact cinematic hero assembled from the original title and its playing video. Browser `video.readyState` was 4.
- **BALIK KARTU** returns to the front, restoring the clickable card and entry button.
- Re-tested the same transition after the new video crop and lighting CSS. The branch alias resolved to the latest deployment, the original front remained intact, the reverse displayed the illuminated figure on the right, and return worked.
- Browser console errors: extension-only metadata messages, no application-origin error observed.
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
- Iteration 4: user screenshot highlighted a P2 visual issue in the reverse: character too centrally placed, obscured by headline, and too dark. Adjusted the MP4 crop 22% right and moved the darkening gradient left. Compared source screenshot to the live browser output at the reverse-card state: face and body now bright and positioned wholly to the right of the headline. A later playing-video frame shows the woman stepping closer to the card edge, which is expected motion rather than layout overflow; the card frame remains stable.

## Follow-up polish

- Replace LOHITHA/placeholder CTAs when a final identity is selected.
- Check a real smartphone and tune the video crop and small microprint if necessary.
- Decide whether to publish beyond the protected preview stage.
