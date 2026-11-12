import type { SiteDocument } from "./sites";

const summarize = (items: Array<{ label: string; value: string }>, max = 6) =>
  items.filter((item) => item.value.trim()).slice(0, max)
    .map((item) => item.label.trim() + ": " + item.value.trim()).join("; ");

export function generateNaminaPrompts(site: SiteDocument) {
  const name = site.content.identity.displayName.trim() || "the client";
  const profession = site.content.identity.profession.trim() || "professional";
  const original = site.content.original;
  const profile = summarize(original?.nama.items || []);
  const career = summarize(original?.karir.items || []);
  const skills = summarize(original?.skill.items || []);
  const works = original?.karya.items.slice(0, 4).map((item) => item.title).filter(Boolean).join(", ") || "";
  const products = original?.produk.items.slice(0, 4).map((item) => item.title).filter(Boolean).join(", ") || "";

  return {
    image: [
      "NAMINA — CINEMATIC CLIENT PORTRAIT",
      "Client: " + name,
      "Profession: " + profession,
      profile ? "Profile: " + profile : "",
      career ? "Career context: " + career : "",
      skills ? "Skills: " + skills : "",
      works ? "Selected works: " + works : "",
      products ? "Products/services: " + products : "",
      "",
      "Use the CLIENT REFERENCE PHOTO as the PRIMARY identity and outfit reference.",
      "If an environment/style reference is supplied, use it only for lighting, atmosphere, camera and composition. Never copy the reference person's face.",
      "Generate one photorealistic premium cinematic FULL-BODY portrait in a vertical forward-walking pose.",
      "The client is centered precisely in the frame, head and feet fully visible, mid-stride already walking toward the viewer.",
      "Preserve recognizable facial identity, age appearance, skin tone, natural facial proportions and original outfit from the client's photo. Avoid facial reshaping or generic AI faces.",
      "Adapt facial expression and professional confidence appropriately for the profession listed above.",
      "Sophisticated dark cinematic studio, realistic directional lighting, natural shadows and visible floor perspective.",
      "Camera at eye level, symmetrical composition, no text, no logos, no extra people, no watermark.",
      "IMPORTANT: The client image is required for identity preservation; do not invent their appearance when no reference is provided.",
    ].filter((line) => line !== "").join("\n"),
    video: [
      "NAMINA.PRO — INFINITE CINEMATIC WALKING LOOP",
      "Client: " + name,
      "Profession: " + profession,
      "",
      "INPUT: Use the final approved CLIENT PORTRAIT IMAGE as the primary identity/outfit reference. If a reference video exists, use it only for cinematic ambience and motion style.",
      "Animate the character already walking toward the viewer from frame one. No standing, starting pose, slowing down, stopping, turning, or ending pose.",
      "Keep camera FIXED and centered. Character stays at the exact same screen location and constant size, as if walking on a treadmill.",
      "Maintain realistic full-body walking biomechanics, continuous alternating footsteps, natural torso rhythm and professional expression.",
      "CRITICAL FLOOR MOTION: The floor texture, reflections, and perspective markings must visibly travel backward underneath the feet at the same speed as the forward stepping movement. Do not freeze the floor.",
      "Maintain stable facial identity, outfit, proportions, background, lighting and shadows. No face morphing, extra limbs, jumps or camera zoom.",
      "Seamless cyclical motion: opening frame is already walking and final frame transitions naturally to the opening frame without any freeze, cut or change in scale.",
      "Photorealistic cinematic lighting, premium dark studio background, centered full body, realistic contact shadows, no text, no logos, no captions.",
      "Create a clean looping video suitable for a website background. Export a compressed web-friendly MP4, ideally H.264, muted.",
    ].join("\n"),
  };
}
