# Design QA — Square ENTER Keycap

Date: 2026-11-08
Result: **passed**

- Desktop (1920 px): photorealistic square black keycap on the left of the name; button is 200 × 200 px and its top aligns within 2 px of the 210 px-high two-line heading.
- Tablet (820 px): responsive square control retains the name/title hierarchy.
- Mobile (390 px): 74 × 74 px keycap; heading remains legible, character video stays visible, and no horizontal overflow is present.
- Interaction: ENTER remains a working button, advances card content, and retains keyboard focus styling.
- Drop physics: one incoming card per press; its 2.35-second flight hits the reading surface, rebounds three times with decreasing height, then settles. The old three miniature card trails were removed.
- Floor feedback: an elliptical contact shadow intensifies at each bounce; outgoing cards quietly fade rather than appearing as a second falling card.
- Completion: the flying layer is removed at animation end and ENTER is enabled again; verified on desktop and mobile (390 px), including the mobile-specific bounce keyframes.
- Background: autoplay cinematic video is not obscured and remains playing after ENTER is clicked.
- Accessibility: button has a descriptive `aria-label`; imagery inside is decorative.
- Verification: TypeScript typecheck, Vite production build, and all 24 automated tests passed. Inspected deployment preview on desktop and mobile.

Bounce preview verified: https://namana-l4dszifbi-jualdigital.vercel.app/vini
