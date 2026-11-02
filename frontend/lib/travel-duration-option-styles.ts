// frontend/lib/travel-duration-option-styles.ts
//
// The one place the Travel Mode duration options get their look. Every screen that lists
// the options ("A few days", "1–2 weeks", ...) takes these three class strings, so a new
// screen cannot drift from the others. Lives in lib/ because that is scanned by Tailwind.
//
//   - hover: the label turns semibold and darker, and the row presses in by 1%;
//   - selected: the label of the checked option is semibold (hover does not change it);
//   - disabled (a request is in flight): no hover or press feedback on unselected options.

/** The option row: the radio and its label. Hover/selected state of the label reads this. */
export const TRAVEL_DURATION_OPTION_ROW_CLASS =
  "group flex w-fit origin-left items-center gap-x-3 transition-transform duration-150 ease-out active:scale-[0.99] has-[:disabled]:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"

/** The radio itself. */
export const TRAVEL_DURATION_OPTION_RADIO_CLASS =
  "cursor-pointer disabled:cursor-not-allowed"

/** The option's Label. */
export const TRAVEL_DURATION_OPTION_LABEL_CLASS =
  "transition-[color,font-weight] duration-150 ease-out group-hover:font-semibold group-hover:text-gray-900 group-has-[[data-state=checked]]:font-semibold group-has-[:disabled]:cursor-not-allowed group-has-[:disabled]:group-hover:text-gray-800 group-has-[:disabled]:group-has-[[data-state=unchecked]]:group-hover:font-medium motion-reduce:transition-none"
