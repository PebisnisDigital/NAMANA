# PESONAFLIX Cinematic Welcome — Design QA

**Final result: passed**

## Findings

- No actionable P0/P1/P2 issues in the verified 1363 × 936 desktop viewport.
- P3: The profile fields in all seven categories remain em-dash placeholders until Teh Vini supplies authentic data.
- P3: Dedicated mobile-browser visual inspection remains recommended. Responsive rules are implemented at 850px and 600px; the current Cloud Browser session does not expose viewport resizing.

## Visual source and rendered evidence

- Primary design direction: user's request on 2026-11-06 to **replace the entire KTP flip card** with a full website consisting of only one cinematic hero section, preceded by a **WELCOME PESONAFLIX** entry screen.
- Current iteration reference: the user's annotated full-screen hero screenshot on 2026-11-06 showing seven adjacent tab positions immediately above “IDENTITAS DIGITAL”. The seven labels are Identitas, Pendidikan, Hobi, Skill, Pengalaman, Karya, and Sertifikasi.
- Latest **layout revision** reference: `/workspace/scratch/f1f0427e572e/upload/image(20261106-042452).png`, 1879 × 918 px, annotated to swap the display-title block **above** the tabs, leaving the profile data below. This is a reordering instruction, not a new art direction; all media, colors, and typography stay as before.
- Existing brand-language reference, visually opened in Cloud Browser tab 3: `https://pesonaflix.vercel.app/vini`. Its intro shows large white title, black / red stage, person as the focal point, and a single entry CTA. This is an **inspiration reference**, not a pixel-perfect source to clone. Source screenshot: Cloud Browser tab 3, 1363 × 936 px viewport and screenshot (approximately 1× pixel density).
- Existing cinematic composition reference: user's marked screenshots `/workspace/scratch/f1f0427e572e/upload/image(20261106-024253).png` and `/workspace/scratch/f1f0427e572e/upload/image(20261106-030042).png`; they establish the original-exposure video woman and six data labels from the preceding iteration. The **card dimensions and flip layout are intentionally obsolete**.
- Implementation: `https://pesonaflix-cinematic-replica-git-card-both-s-0cbdad-jualdigital.vercel.app/` (the user's **unchanged stable preview alias**), Vercel staging deployment `dpl_7v5UL1MQvQF9cX5XAE515sKktLJ5`, branch `card-both-sides-preview`, code commit `319ccecd30b7b76552659b7758053fa29bd9e09b`.
- Rendered screenshot evidence: Cloud Browser tab 1, both the WELCOME state and the hero state after the loading transition, 1363 × 936 browser CSS viewport / 1363 × 936 screenshot (1×). Screenshots are captured in the browser test output rather than a separate workspace file.
- Comparison: at an equal desktop viewport, the new WELCOME uses the production intro's dark/red cinematic vocabulary and one large central title plus CTA; the hero extends video and data content to the full browser instead of placing them in a rounded card. The latest hero capture puts the woman at right and all six labels at left, with no browser-horizontal overflow. The source is art-direction-only; exact pixel overlap is neither expected nor claimed.
- Current revision comparison: visual source 1879 × 918 px vs implementation 1363 × 936 px (different capture sizes, same desktop design breakpoint). Rather than compare raw coordinates, normalized the composition to the left-column region and checked vertical order. Rendered browser screenshot shows kicker/title/description first, a seven-segment tab strip immediately below, and the six-row profile after that. The woman remains on the right. There is no leftover tab strip above the heading.
- Focused region evidence: welcome CTA initially displayed a missing-glyph box for the diagonal arrow; a subsequent CSS font fallback fix yielded a visible arrow in the new screenshot. The first full-screen hero placed the woman too centrally; after moving the video right by 14%, the new screenshot shows her on the right without covering the data grid.

## Required fidelity surfaces

1. **Typography:** Bebas Neue for massive WELCOME / PESONAFLIX / KENAL LEBIH DEKAT headings, Montserrat for UI/data, and Cormorant Garamond for the small italic “TO”. Correct hierarchy, readable field labels, no clipping or unintended line wraps in desktop captures.
2. **Spacing and layout:** welcome is its own edge-to-edge viewport; hero is exactly one full-height section, not a fixed-size card. Dark left reading area and full-height right video have clear separation without drawn panel borders. Desktop `documentElement.scrollWidth = 1363` and height `936`, matching the viewport.
3. **Colors:** black/charcoal, warm off-white, PESONAFLIX red on welcome, and restrained gold for the hero title and identity details. The source video's brightness filter is explicitly `none`.
4. **Images/media:** original `/videos/hero.mp4` reused; no fake person illustration or cutout, preserved lighting. Browser showed `readyState=4`, `paused=false`, currentTime increasing. Intro uses typography rather than a replacement portrait because the user asked for a generic welcome, not a specific person's portrait.
5. **Copy/content:** frontend is in Indonesian; WELCOME is branded, hero defaults to “KENAL LEBIH DEKAT” and the requested Nama, Tempat/Tanggal Lahir, Alamat, Agama, Status, Pekerjaan. All seven tabs change the left-side heading, explanatory copy, and their own six relevant labels; empty values are honest placeholders, with no fake personal details.

## Interactions and runtime checks

- Initial link loads WELCOME with a visible **MASUK** button.
- Clicking **MASUK** produces a full-screen branded loading screen and then displays the hero.
- **KEMBALI** returns to the welcome and restores keyboard focus to **MASUK**.
- Browser accessibility snapshot shows the intended headings, button labels and six definition-list rows.
- Seven equal-height segmented tabs now sit **below the large title and subtitle** and **above the profile field list**. Clicking **Pendidikan**, **Karya**, and **Sertifikasi** was browser-tested and produced category-specific content; **Identitas** is selected on initial entry. Browser accessibility exposes `tablist`, seven labeled tabs, `aria-selected`, and one `tabpanel`. Pressing **ArrowRight** on Identitas selected Pendidikan.
- Latest screenshot measurement (1363 × 936 desktop): for Sertifikasi, title bottom 345 CSS px, tab strip top 433 CSS px, profile starts 495 and ends 774 CSS px. All content stays on-screen; `documentElement.scrollWidth` equals viewport width 1363. Browser screenshots show correct gold active-state styling and preserved left/right composition.
- The original right-hand video stayed mounted and played continuously while tabs changed: observed `currentTime` increased from 3.11s to 5.33s, `paused=false`, `readyState=4` before and after the transitions.
- Hero video playback verified (`readyState=4`, not paused).
- No page-specific JavaScript console errors were seen; error log entries were browser-extension metadata only.
- `npm run build` passed. `npm run lint` passed with an unrelated, pre-existing hook warning in the unused `ScrollStack.tsx`.
- Vercel staging deployment `dpl_7v5UL1MQvQF9cX5XAE515sKktLJ5` is **READY** and retains the same preview alias. The main PESONAFLIX production project was not modified.

## Comparison history

1. Before this request, the prototype contained a front KTP-inspired card and a back cinematic data card. User explicitly rejected the card form factor and asked for a website-level hero plus a PESONAFLIX-like welcome, so this was an intentional full-screen redesign rather than accidental drift.
2. First browser capture: WELCOME matched the intended dark/red cinematic feel and CTA, but its ↗ icon displayed as an unsupported box (P2 polish). The initial hero placed the person too centrally, close to the left data grid (P2 composition).
3. Fix: set a symbol-capable font fallback for the arrow and moved the background video right by 14% on desktop. After redeploy, both captures show a normal arrow and a right-aligned person. Source video exposure remained unchanged.
4. Re-tested welcome → loading → hero → welcome with browser accessibility snapshots and screenshots. No actionable P0/P1/P2 issues remained at the tested desktop width.
5. Added seven functional tabs on the **same hero**, preserving the welcome/loading flow and video composition. Re-tested the identical stable URL, category switches and keyboard navigation; the existing production PESONAFLIX project remained isolated.
6. Latest feedback requested the inverse title/tab order. Moved `.cinematic-hero__intro` above `.cinematic-hero__tabs` in the actual DOM (not just visual CSS order), kept tab buttons mounted across category changes for keyboard continuity, and retained the panel data below. Rebuilt and visually checked the stable Vercel preview; no P0/P1/P2 issues emerged. Only browser-extension metadata errors appeared in the console, not application errors.

## Follow-up

- Fill biodata only when approved profile details are available.
- Test on a physical phone / 390 × 844 browser viewport before public promotion.
- Keep the lab repo and staging preview separate until Teh Vini approves production integration.
