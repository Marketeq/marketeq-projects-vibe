// frontend/lib/travel-check-in-prompt-layout.ts
//
// Layout classes of the "Still traveling?" check-in prompt (Figma 13101-46785), kept in one
// place so a browser test can apply the exact production strings. Lives in lib/ because that
// is scanned by Tailwind.

/** The dialog. */
export const CHECK_IN_PROMPT_DIALOG_CLASS =
  "w-[405px] max-w-[calc(100vw-2rem)] pt-[50px]"

/**
 * The row holding "I'm still traveling" and "Update my home country". From 768px up it is one
 * centered row, 12px apart: the pair (144 + 12 + 227px) is wider than the 357px content box,
 * and flex centering spreads the surplus evenly into the dialog padding, so both buttons keep
 * the same distance from the dialog's edges. Below 768px it is a centered column.
 */
export const CHECK_IN_PROMPT_ACTIONS_CLASS =
  "mt-[50px] flex flex-col items-center gap-3 md:flex-row md:justify-center"

/** "Update my home country": as wide idle as it is while loading (spinner included). */
export const CHECK_IN_PROMPT_UPDATE_BUTTON_CLASS = "min-w-[227px]"
