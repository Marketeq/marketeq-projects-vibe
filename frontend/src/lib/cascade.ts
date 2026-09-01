/**
 * Stagger ladder for card cascades, matching the one used on My Jobs, My
 * Contracts and My Team.
 *
 * Only uses values that exist on Tailwind's delay scale; tailwindcss-animate
 * maps `delay-*` to animation-delay. Beyond the last step every card shares
 * the final delay so a long list never feels slow.
 */
export const CASCADE_DELAYS = [
  "delay-0",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
]

export const cascadeDelay = (index: number) =>
  CASCADE_DELAYS[Math.min(index, CASCADE_DELAYS.length - 1)]

/** The full cascade class set for one card at `index`. */
export const cascadeClasses = (index: number) =>
  `animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(index)}`
