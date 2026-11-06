# PESONAFLIX Digital Identity Flip — Design QA

**Final result: passed**

## Evidence

- Source visual truth (front): `/workspace/scratch/f1f0427e572e/upload/ktp-3556918652.jpg` (720 × 450 px photographic reference; card region approximately 590 × 355 px). Latest source visual truth (back): `/workspace/scratch/f1f0427e572e/upload/image(20261106-030042).png` (1086 × 733 px annotated browser screenshot: red marks remove top eyebrow, both in-card top labels, divider, both in-card footer labels, explanatory copy, lower button and disclaimer). Earlier references: `image(20261106-024253).png` and `image(20261106-023150).png`.
- Current implementation: `https://pesonaflix-cinematic-replica-git-card-both-s-0cbdad-jualdigital.vercel.app/` (same stable branch preview alias; latest staging deployment `dpl_9LXJ2gUC8nTiS3DdvkvJzmwAa2ao`, Git commit `cd20acee656491236e65ff0ca9bc462ac0effe22`, branch `card-both-sides-preview`). Previous deployment: `dpl_2Dwi8a4HNy68QLxTHfM9fFs1hpG3`.
- Implementation screenshot evidence: browser tab 4 front and back screenshots captured again after redeploy on 2026-11-06. The back screenshot shows only **DATA PEMILIK KARTU**, six empty identity rows and the woman in the video, with no other visible labels or controls. The front screenshot shows the illustrative card and **MASUK** button without extra caption. Screenshot capture is available in the browser test session (no separate workspace file). Browser viewport: 1363 × 936 CSS px, screenshot raster 1363 × 936 px (approximately 1×). Prior browser DOM measurements confirmed **both card faces are exactly 780 × 488 CSS px** at this viewport.
- Comparison basis: compare the card region of the desktop screenshot with the supplied photographic card, normalized by the card's ~1.6:1 aspect ratio. A pixel-by-pixel match is intentionally out of scope: the user requested a PESONAFLIX digital card *inspired by* the KTP reference, not an official ID replica.
- The source card includes an official state emblem and official wording. The prototype intentionally uses generated abstract heraldic art, PESONAFLIX wording and **BUKAN DOKUMEN RESMI** marking.

## Five fidelity surfaces

1. Typography: bold dark serif front heading and clean Montserrat labels in the reverse's six-row identity grid. Text remains readable in the desktop screenshot, with no long-label wrapping. Generated front texture contains no embedded text; labels are responsive HTML.
2. Spacing/layout: centered compact 1.6:1 card with rounded corners; crest at upper-left, title at upper-middle/right, map below and iridescent strip at bottom. **The reverse uses the exact same card-sized stage**, a left 47%-wide data section without a divider, and the original video portrait on the right. No explanatory caption or secondary back button remains under the card.
3. Colors/tokens: security-pattern blue base, rich green Indonesia map, metallic gold decorative crest, holographic rose-purple band, dark outer theater background.
4. Image quality: the front illustration is a new ~242 KB WebP generated for the prototype, not a stretched copy of the supplied 720px image. The original upstream MP4 is reused, cropped 22% right to fill the reverse card. **All brightness/contrast/saturation filters have been removed (`filter: none`)** so the video's native darker cinematic appearance is preserved, with a left-only reading gradient. The figure remains in the right panel without covering biodata.
5. Copy/content: deliberately uses **Kartu Identitas Digital / PESONAFLIX** on the front and not Indonesian government identity wording; the front marks it as **BUKAN DOKUMEN RESMI**. The reverse lists only the requested labels: Nama; Tempat, Tanggal Lahir; Alamat; Agama; Status; Pekerjaan. Values use an em dash until real data is provided. The red-crossed microcopy outside and inside the reverse card is absent; the entry CTA **MASUK** remains on the front only.

## Interactions checked

- Initial card/front screen opens and renders in the cloud browser.
- **MASUK** activates an accessible loading state.
- After loading, the **card-only 3D flip** reveals the new two-panel identity side and playing video. Browser `video.readyState` was 4 and computed `filter` was `none`.
- Clicking anywhere on the back face returns to the front, restoring the clickable card and the **MASUK** button, without a redundant visible back button.
- Re-tested the same transition after the new six-field layout and video-filter removal. The same branch alias resolved to the latest deployment, the original front remained intact, the reverse displayed all six blank fields next to the right-aligned figure, and return worked.
- Browser console errors: extension-only metadata messages, no application-origin error observed.
- The browser console showed no app-originated errors; logs were limited to browser-extension metadata and Vercel sign-in/Google One Tap from the earlier protected-page redirect.
- Vercel build: READY. Local `npm run build`: passed; `npm run lint`: one pre-existing warning in unused `ScrollStack.tsx`.

## Findings and accepted gaps

- **P3 / Empty identity fields**: all six field values intentionally contain em dashes because user data has not been provided yet. Replace with authentic owner information later.
- **P3 / Mobile visual QA**: mobile layout is implemented using a 700px breakpoint, but the connected cloud browser did not advertise a mobile viewport override. A real-phone review remains recommended before a public launch.
- **Local preview unavailable**: the local Vite dev server failed to enumerate network interfaces in the execution container; the separate Vercel staging deployment was used for browser-based verification instead.

## Comparison history

- Iteration 1: generated front-card artwork placed behind HTML headings. Browser screenshot confirmed a card proportion, map, foil band and title visually consistent with the supplied reference.
- Iteration 2: replaced full-screen reverse HeroSection with an original-video cinematic composition contained entirely inside an identically sized card.
- Iteration 3: first browser run exposed a P1 3D compositing bug: `filter: drop-shadow` flattened the flipping parent, showing a mirrored front despite reverse-side content in the accessibility tree. Removed the filter, applied shadows to each face, redeployed, and confirmed the reverse video/text appears correctly in the live screenshot.
- Final screenshot confirms both sides are 780 × 488 px, return action works, no page-scale flip remains.
- Iteration 4: user screenshot highlighted a P2 visual issue in the reverse: character too centrally placed, obscured by headline, and too dark. Adjusted the MP4 crop 22% right and moved the darkening gradient left. Compared source screenshot to the live browser output at the reverse-card state: face and body now bright and positioned wholly to the right of the headline. A later playing-video frame shows the woman stepping closer to the card edge, which is expected motion rather than layout overflow; the card frame remains stable.
- Iteration 5: user screenshot highlighted overly bright video and requested the left region be replaced with six identity fields. Removed video filter, replaced the upstream cinematic headline/roles/description with six labelled rows and blank placeholders, added a subtle vertical panel divider. Latest live screenshot demonstrates the lower-exposure right-side video and readable left panel; no current actionable P0/P1/P2 mismatch identified against the annotated request.
- Iteration 6: user's 1086 × 733 annotated screenshot marked nonessential headers, the divider, card-bottom captions, external explanatory text, and return buttons for deletion (P2 clutter relative to the desired bare card). Removed all marked reverse-side labels and divider, hid the redundant external button on the reverse while preserving click-anywhere flip, and removed the explanatory copy from the front as well. The live 1363 × 936 screenshot from deployment `dpl_9LXJ2gUC8nTiS3DdvkvJzmwAa2ao` shows the bare six-row card with its original video, no cross-marked chrome, and the front with only **MASUK** below. Checked loading and return-to-front interactions in the browser after redeploy. No actionable P0/P1/P2 differences remain.

## Follow-up polish

- Populate the six owner fields when the real identity data is provided; avoid real or official government identifiers in the demo.
- Check a real smartphone and tune the video crop and small microprint if necessary.
- Decide whether to publish beyond the protected preview stage.
