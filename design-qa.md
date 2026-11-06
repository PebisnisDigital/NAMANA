# PESONAFLIX Cinematic Welcome — Design QA

**Final result: passed**

## Findings

- No actionable P0/P1/P2 issues in the verified 1363 × 936 desktop viewport.
- P3: Six profile values remain em-dash placeholders until Teh Vini supplies authentic data.
- P3: Dedicated mobile-browser visual inspection remains recommended. Responsive rules are implemented at 850px and 600px; the current Cloud Browser session does not expose viewport resizing.

## Visual source and rendered evidence

- Primary design direction: user's request on 2026-11-06 to **replace the entire KTP flip card** with a full website consisting of only one cinematic hero section, preceded by a **WELCOME PESONAFLIX** entry screen.
- Existing brand-language reference, visually opened in Cloud Browser tab 3: `https://pesonaflix.vercel.app/vini`. Its intro shows large white title, black / red stage, person as the focal point, and a single entry CTA. This is an **inspiration reference**, not a pixel-perfect source to clone. Source screenshot: Cloud Browser tab 3, 1363 × 936 px viewport and screenshot (approximately 1× pixel density).
- Existing cinematic composition reference: user's marked screenshots `/workspace/scratch/f1f0427e572e/upload/image(20261106-024253).png` and `/workspace/scratch/f1f0427e572e/upload/image(20261106-030042).png`; they establish the original-exposure video woman and six data labels from the preceding iteration. The **card dimensions and flip layout are intentionally obsolete**.
- Implementation: `https://pesonaflix-cinematic-replica-git-card-both-s-0cbdad-jualdigital.vercel.app/` (the user's existing stable preview alias), Vercel staging deployment `dpl_595NfiADM5rF1FFbqJtf5rPEcwgw`, branch `card-both-sides-preview`, code commit `999d6dfdda46ec606646053551ec5e90294e0e48`.
- Rendered screenshot evidence: Cloud Browser tab 1, both the WELCOME state and the hero state after the loading transition, 1363 × 936 browser CSS viewport / 1363 × 936 screenshot (1×). Screenshots are captured in the browser test output rather than a separate workspace file.
- Comparison: at an equal desktop viewport, the new WELCOME uses the production intro's dark/red cinematic vocabulary and one large central title plus CTA; the hero extends video and data content to the full browser instead of placing them in a rounded card. The latest hero capture puts the woman at right and all six labels at left, with no browser-horizontal overflow. The source is art-direction-only; exact pixel overlap is neither expected nor claimed.
- Focused region evidence: welcome CTA initially displayed a missing-glyph box for the diagonal arrow; a subsequent CSS font fallback fix yielded a visible arrow in the new screenshot. The first full-screen hero placed the woman too centrally; after moving the video right by 14%, the new screenshot shows her on the right without covering the data grid.

## Required fidelity surfaces

1. **Typography:** Bebas Neue for massive WELCOME / PESONAFLIX / KENAL LEBIH DEKAT headings, Montserrat for UI/data, and Cormorant Garamond for the small italic “TO”. Correct hierarchy, readable field labels, no clipping or unintended line wraps in desktop captures.
2. **Spacing and layout:** welcome is its own edge-to-edge viewport; hero is exactly one full-height section, not a fixed-size card. Dark left reading area and full-height right video have clear separation without drawn panel borders. Desktop `documentElement.scrollWidth = 1363` and height `936`, matching the viewport.
3. **Colors:** black/charcoal, warm off-white, PESONAFLIX red on welcome, and restrained gold for the hero title and identity details. The source video's brightness filter is explicitly `none`.
4. **Images/media:** original `/videos/hero.mp4` reused; no fake person illustration or cutout, preserved lighting. Browser showed `readyState=4`, `paused=false`, currentTime increasing. Intro uses typography rather than a replacement portrait because the user asked for a generic welcome, not a specific person's portrait.
5. **Copy/content:** frontend is in Indonesian; WELCOME is branded, hero shows “KENAL LEBIH DEKAT” and the requested Nama, Tempat/Tanggal Lahir, Alamat, Agama, Status, Pekerjaan. Empty values are honest placeholders; no fake personal details.

## Interactions and runtime checks

- Initial link loads WELCOME with a visible **MASUK** button.
- Clicking **MASUK** produces a full-screen branded loading screen and then displays the hero.
- **KEMBALI** returns to the welcome and restores keyboard focus to **MASUK**.
- Browser accessibility snapshot shows the intended headings, button labels and six definition-list rows.
- Hero video playback verified (`readyState=4`, not paused).
- No page-specific JavaScript console errors were seen; error log entries were browser-extension metadata only.
- `npm run build` passed. `npm run lint` passed with an unrelated, pre-existing hook warning in the unused `ScrollStack.tsx`.
- Vercel staging deployment `dpl_595NfiADM5rF1FFbqJtf5rPEcwgw` is **READY** and retains the same preview alias. The main PESONAFLIX production project was not modified.

## Comparison history

1. Before this request, the prototype contained a front KTP-inspired card and a back cinematic data card. User explicitly rejected the card form factor and asked for a website-level hero plus a PESONAFLIX-like welcome, so this was an intentional full-screen redesign rather than accidental drift.
2. First browser capture: WELCOME matched the intended dark/red cinematic feel and CTA, but its ↗ icon displayed as an unsupported box (P2 polish). The initial hero placed the person too centrally, close to the left data grid (P2 composition).
3. Fix: set a symbol-capable font fallback for the arrow and moved the background video right by 14% on desktop. After redeploy, both captures show a normal arrow and a right-aligned person. Source video exposure remained unchanged.
4. Re-tested welcome → loading → hero → welcome with browser accessibility snapshots and screenshots. No actionable P0/P1/P2 issues remained at the tested desktop width.

## Follow-up

- Fill biodata only when approved profile details are available.
- Test on a physical phone / 390 × 844 browser viewport before public promotion.
- Keep the lab repo and staging preview separate until Teh Vini approves production integration.
