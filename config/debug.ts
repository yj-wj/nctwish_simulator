/**
 * Controls development diagnostics at the presentation layer only.
 * Next.js inlines NEXT_PUBLIC_* values into client components at build time.
 */
export const DEBUG_MODE_ENABLED =
  process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
