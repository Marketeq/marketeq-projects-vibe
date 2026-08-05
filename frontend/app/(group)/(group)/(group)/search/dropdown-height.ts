/**
 * Every filter dropdown on the search pages shows at most four suggestions and
 * scrolls past that, so a long list — tags especially, since those grow with
 * the catalogue — can't push the rest of the sidebar off screen.
 *
 * 144px = 4 × 33px rows (ComboboxOption: py-2.5 + 13px/leading-none) plus the
 * three 4px gaps from ComboboxOptions' `space-y-1`. Keep this in sync if either
 * of those styles changes in components/ui/combobox.
 */
export const DROPDOWN_MAX_HEIGHT = "max-h-[144px]"
