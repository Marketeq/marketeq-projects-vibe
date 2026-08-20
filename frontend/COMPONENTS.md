# COMPONENTS.md -- Marketeq Design System Catalog

> **ALL components in this file originate from Storybook. Storybook is the single source of truth for all UI on this platform.**

---

## HARD RULES (NON-NEGOTIABLE, ZERO EXCEPTIONS)

### Rule 1: ONLY use components listed in this file
You may ONLY use components that are cataloged in this file. If a component is not listed here, it does not exist and you CANNOT use it. You CANNOT create new components. You CANNOT build custom UI elements. You CANNOT wrap HTML elements in custom abstractions. Every piece of UI must be composed from components in this file.

### Rule 2: Storybook components are READ-ONLY
You NEVER modify, edit, override, extend, wrap, or change any component in `frontend/components/ui/`. You NEVER modify any file in `frontend/stories/`. You NEVER modify any shared component in `frontend/components/*.tsx`. You import them exactly as they are and use them exactly as they are. If a component does not do what you want, you find a different component from this file that does. You do NOT change the component to fit your needs.

### Rule 3: No custom UI components EVER
You CANNOT create new `.tsx` files that export UI components. You CANNOT define inline component functions that render UI elements (except page-level compositions that ONLY compose components from this file). You CANNOT use raw HTML elements (`<input>`, `<textarea>`, `<select>`, `<button>`, `<label>`, `<dialog>`) when a design system component exists in this file. The ONLY raw HTML allowed is structural elements (`<div>`, `<span>`, `<section>`, `<article>`, `<main>`, `<header>`, `<footer>`, `<nav>`, `<p>`, `<h1>`-`<h6>`, `<ul>`, `<li>`, `<a>`, `<img>`) for layout composition.

### Rule 4: Only use existing Tailwind classes
You ONLY use standard Tailwind utility classes that already exist. You do NOT create custom CSS. You do NOT add arbitrary values (e.g., `text-[13.5px]`) unless there is absolutely no standard Tailwind equivalent. You do NOT override component styles with `!important` unless documented in this file.

### Rule 5: Pages are compositions of these components
Every page in the app is a composition of components from this file. When building or modifying a page, you compose from Section 1 (base UI), Section 2 (shared modules), and Section 3 (page layouts from Storybook). Storybook page stories are the layout source of truth. You match them exactly.

### Rule 6: Before writing ANY UI code
1. Search this file for an existing component that does what you need
2. Check Storybook (`npm run storybook`) to see it rendered
3. If a component exists, use it. If it does not exist, ask the user before proceeding.
4. You NEVER proceed to build custom UI without confirming no suitable component exists in this file

### Violation = Automatic Rejection
Any PR or code change that creates custom UI components, modifies Storybook source components, or uses UI elements not in this file will be automatically rejected. No exceptions. No "just this once." No "temporary solution."

---

## SPACING & LAYOUT SYSTEM

> **Source of truth:** All values below are extracted from the full-page Storybook screens. Use ONLY these spacing values when building pages. Do not invent custom spacing.

All spacing follows a **4px base grid**. Values are expressed as Tailwind classes.

---

### Page Container Padding

The outermost content wrapper on every page.

| Context | Horizontal | Vertical | Used on |
|---------|-----------|----------|---------|
| Standard pages | `px-[100px]` | `py-[50px]` | Talent Profile, Project Details |
| Category pages | `px-[50px]` | `py-[50px]` | Categories L1, L2, L3 |
| Onboarding content area | `px-[200px]` | `py-[100px]` | Client Onboarding, Talent Onboarding |
| Onboarding sidebar | `p-[75px]` | — | Onboarding left panels |
| Dashboard/sidebar pages | `px-5` (20px) | `py-6` (24px) | Sidebar layouts, Complete My Profile |

### Section Spacing (Vertical Gaps Between Major Blocks)

Space between top-level sections on a page (e.g., between a hero and a card grid, between two card groups).

| Value | Pixels | When to use |
|-------|--------|-------------|
| `mt-[50px]` | 50px | Between hero/banner and main content grid |
| `mt-10` | 40px | Between major page sections |
| `mt-8` | 32px | Between related section groups |
| `mt-6` | 24px | Standard section gap (most common) |
| `mt-[30px]` | 30px | Sub-sections under headers (onboarding) |
| `gap-y-6` | 24px | Flex column layouts with multiple sections |
| `gap-y-5` | 20px | Flex column section spacing (onboarding cards) |

### Widget / Card Padding

Internal padding of cards, panels, and content widgets.

| Value | Pixels | When to use |
|-------|--------|-------------|
| `p-10` | 40px | Large profile header cards |
| `p-8` | 32px | Content-heavy panels (project details message area) |
| `p-6` | 24px | Standard cards with moderate content |
| `p-5` | 20px | Most common card padding (category cards, sidebar cards, form cards) |
| `p-4` | 16px | Compact cards, modals, dialog content |
| `p-3` | 12px | Tight widget padding (message input area, inline tools) |

### Grid Gaps (Between Cards in Grids)

| Value | Pixels | When to use |
|-------|--------|-------------|
| `gap-[15px]` | 15px | Card grids on category pages (grid-cols-4, grid-cols-5) |
| `gap-6` | 24px | Standard content grids |
| `gap-5` | 20px | Portfolio / gallery grids |
| `gap-x-3` | 12px | Horizontal spacing in inline grids (step indicators, tab groups) |

### Content Spacing Within Sections

Vertical spacing between items inside a card or section.

| Value | Pixels | When to use |
|-------|--------|-------------|
| `gap-y-6` | 24px | Form sections, card groups inside a panel |
| `gap-y-5` | 20px | Benefit/feature lists, onboarding card stacks |
| `gap-y-3` | 12px | Button rows, action groups |
| `space-y-5` | 20px | Stacked list items (feature lists, onboarding benefits) |
| `space-y-3` | 12px | List items (payment methods, radio groups) |
| `space-y-2` | 8px | Tightly related stacked content |
| `space-y-1` | 4px | Minimal list spacing (nav items, metadata lines) |

### Header / Title Margins

| Value | Pixels | When to use |
|-------|--------|-------------|
| `mt-6` | 24px | Below page title before content starts |
| `mt-3` | 12px | Below section title before section content |
| `mt-2` | 8px | Below heading before description text |
| `mt-1` | 4px | Subtitle directly under a title |
| `mb-4` | 16px | Bottom margin closing a header block |
| `mb-3` | 12px | Bottom margin for sub-headers |

### Horizontal Component Spacing

| Value | Pixels | When to use |
|-------|--------|-------------|
| `gap-x-10` | 40px | Profile avatar to profile content |
| `gap-x-6` | 24px | Side-by-side content panels |
| `gap-x-5` | 20px | Sidebar to main content |
| `gap-x-3` | 12px | Icon + text pairs, inline groups (most common horizontal gap) |
| `gap-x-2` | 8px | Tight inline elements (badge + badge, small icon + label) |

### Section Dividers

| Pattern | When to use |
|---------|-------------|
| `border-b border-gray-200 pb-4` | Divider between card sections with bottom padding |
| `border-b border-gray-200 pb-5` | Divider with slightly more breathing room |
| `divide-y divide-gray-200` | Auto-dividers on stacked list items |

### Sidebar Navigation

| Value | Pixels | When to use |
|-------|--------|-------------|
| `py-6 px-[15px]` | 24px / 15px | Sidebar container padding (publish-project, complete-my-profile) |
| `px-3 py-2` | 12px / 8px | Individual nav item padding |
| `pl-[25px]` | 25px | Nested/indented nav items |
| `gap-x-3` | 12px | Icon to label spacing in nav items |

### Quick Reference (Most Used Values)

These are the spacing values you will use 90% of the time:

| Pixels | Tailwind | Usage |
|--------|----------|-------|
| 4px | `1` | Tight subtitle gaps, minimal list spacing |
| 8px | `2` | Small gaps, tight stacked content |
| 12px | `3` | Icon-to-text, inline groups, nav item padding |
| 16px | `4` | Compact card padding, header bottom margins |
| 20px | `5` | Standard card padding, list stacks, flex gaps |
| 24px | `6` | Standard section gaps, form sections, content grids |
| 32px | `8` | Content panel padding, section group gaps |
| 40px | `10` | Large card padding, major section breaks |
| 50px | `[50px]` | Page vertical padding, hero-to-content breaks |
| 100px | `[100px]` | Page horizontal padding (standard pages) |

---

## SECTION 1: Base UI Components

All base components live in `frontend/components/ui/` and are re-exported from the barrel `@/components/ui` (via `frontend/components/ui/index.ts`).

---

### Accordion
- **Import**: `import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, DisclosureContent } from "@/components/ui"`
- **Key Props**: AccordionItem takes `value: string`; AccordionTrigger/AccordionContent are standard forwardRef divs
- **Variants**: Built on Radix AccordionPrimitive
- **Storybook**: `components/ui/accordion/`

### Alert
- **Import**: `import { Alert, AlertContent, AlertIcon, AlertTitle, AlertDescription, CloseButton } from "@/components/ui"`
- **Key Props**: `variant?: "default" | "primary" | "error" | "warning" | "success"`, `value: boolean`, `onValueChange: (value: boolean) => void`
- **Variants**: default, primary, error, warning, success
- **Storybook**: `components/ui/alert/alert.stories.tsx` (Success)

### ApplePayCard / GooglePayCard
- **Import**: `import { ApplePayCard, GooglePayCard } from "@/components/ui"`
- **Key Props**: `onRemove?: () => void`, `amountToBePaid: string`
- **Variants**: Apple Pay, Google Pay
- **Storybook**: N/A (no stories file)

### Autocomplete
- **Import**: `import { Autocomplete, AutocompleteLabel, AutocompleteTrigger, LocationAutocomplete } from "@/components/ui"`
- **Directory**: `autcomplete` (sic)
- **Key Props**: AutocompleteRoot: `value?, onChange?, multiple?, nullable?, defaultValue?`; LocationAutocomplete: `value?: string, onValueChange?: (val: string) => void, invalid?: boolean`
- **Variants**: Default, Location-specific
- **Storybook**: `components/ui/autcomplete/autocomplete.stories.tsx` (Default)

### Avatar
- **Import**: `import { Avatar, AvatarImage, AvatarFallback, AvatarFallbackIcon } from "@/components/ui"`
- **Key Props**: `size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"`, `src`, `alt`
- **Variants**: xs (24px), sm (32px), md (40px), lg (48px), xl (56px), 2xl (64px), 3xl (96px); badge indicator; tooltip variant
- **Storybook**: `components/ui/avatar/avatar.stories.tsx` (Default, Fallback, TooltipVariant)

### AvatarGroup
- **Import**: `import { AvatarGroup, AvatarRoot, AvatarGroupButton } from "@/components/ui"`
- **Key Props**: `max?: number`, `excessClassName?: string`, `excess?: boolean`
- **Variants**: Matches Avatar sizes (xs through 3xl)
- **Storybook**: `components/ui/avatar-group/avatar-group.stories.tsx` (Xs)

### Badge
- **Import**: `import { Badge, badgeVariants } from "@/components/ui"`
- **Key Props**: `asChild?: boolean`; uses `cva` variants
- **Variants**: Default, DotIcon, ArrowRightIcon, ArrowUpIcon
- **Storybook**: `components/ui/badge/badge.stories.tsx` (Default, DotIconVariant, ArrowRightIconVariant, ArrowUpIconVariant)

### BadgeGroup
- **Import**: `import { BadgeGroup } from "@/components/ui"`
- **Key Props**: `max?: number`, `excessClassName?: string`
- **Variants**: N/A
- **Storybook**: N/A

### Breadcrumb
- **Import**: `import { Breadcrumb, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbLink } from "@/components/ui"`
- **Key Props**: `separator?: ReactNode`, `spacing?: string` (default `"0.25rem"`), `listClassName?: string`
- **Styles**: 13px semibold, leading-6, gray-500, opacity-50, gap-2 (8px), capitalize. Home icon 18px with opacity-50. Separator "/" same styles. Links and separators hover from opacity-50 to opacity-100 with transition. Current page (`isCurrentPage`) stays at opacity-50 with `cursor-default` — NO hover effect (you're already on that page).
- **Variants**: Default
- **Storybook**: `components/ui/breadcrumb/breadcrumb.stories.tsx` (Default)

### Button
- **Import**: `import { Button, buttonVariants } from "@/components/ui"`
- **Key Props**: `visual?: "primary" | "error" | "gray"`, `variant?: "filled" | "light" | "outlined" | "ghost" | "link"`, `size?: "sm" | "md" | "lg" | "xl" | "2xl"`, `asChild?: boolean`
- **Variants**: 3 visuals x 5 variants x 5 sizes
- **Storybook**: `components/ui/button/button.stories.tsx` (Primary)

### ButtonGroup
- **Import**: `import { ButtonGroup } from "@/components/ui"`
- **Key Props**: Standard div props
- **Variants**: Filled, Outlined
- **Storybook**: `components/ui/button-group/button-group.stories.tsx` (Filled, Outlined)

### Calendar
- **Import**: `import { Calendar, RangeCalendar, DualCalendar, DoubleCalendar, DateRangeCalendar, type RangeValue } from "@/components/ui"`
- **Key Props**: `value?: Date`, `onValueChange?: (value: Date) => void`, `focusedValue?: Date`, `onFocusedValueChange?: (value: Date) => void`, `className?: string`
- **Variants**: Single, Range, Dual, Double, DateRange
- **Storybook**: `components/ui/calendar/calendar.stories.tsx` (Default, RangeCalendarVariant, DualCalendarVariant, DoubleCalendarVariant, DateRangeCalendarVariant)

### Card
- **Import**: `import { Card } from "@/components/ui"`
- **Key Props**: Standard div props
- **Storybook**: N/A

### VersionCard
- **Import**: `import { VersionCardRoot, VersionCardHeader, VersionCardFooter, VersionCardTitle, VersionCardDescription } from "@/components/ui"` (re-exported from card index)
- **Key Props**: Standard div props
- **Storybook**: N/A

### Article
- **Import**: `import { Article } from "@/components/ui"` (re-exported from card index)
- **Key Props**: `isDragging?: boolean`, `isError?: boolean`, `isSelected?: boolean`, `asChild?: boolean`, `isGrabbed?: boolean`, `isOnCanvas?: boolean`, `destructive?: boolean`, `variant?: "default" | "outlined" | "destructive"`
- **Storybook**: N/A

### ActionCard
- **Import**: `import { ActionCardRoot, ActionCardIcon, ActionCardContent, ActionCardTitle, ActionCardDescription } from "@/components/ui"` (re-exported from card index)
- **Key Props**: Standard div props per sub-component
- **Storybook**: N/A

### Carousel
- **Import**: `import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, CarouselPreviousTrigger, CarouselNextTrigger, useCarousel, type CarouselApi } from "@/components/ui"`
- **Key Props**: `opts?: CarouselOptions`, `plugins?: CarouselPlugin`, `orientation?: "horizontal" | "vertical"`, `setApi?: (api: CarouselApi) => void`
- **Variants**: Horizontal, Vertical
- **Storybook**: N/A

### Checkbox
- **Import**: `import { Checkbox } from "@/components/ui"`
- **Key Props**: `size` (sm, md, lg via cva variants), standard checkbox props, `isInvalid`
- **Variants**: sm, md, lg
- **Storybook**: `components/ui/checkbox/checkbox.stories.tsx` (Sm, Md, Lg)

### CheckboxSelector
- **Import**: `import { CheckboxSelector } from "@/components/ui"` (re-exported from checkbox index)
- **Key Props**: Uses cva variants for styling
- **Storybook**: N/A

### CheckboxGroup
- **Import**: `import { CheckboxGroup } from "@/components/ui"`
- **Key Props**: Standard div props for grouping checkboxes
- **Variants**: SmLabel, MdLabel, LgLabel
- **Storybook**: `components/ui/checkbox-group/checkbox-group.stories.tsx` (SmLabel, MdLabel, LgLabel)

### Clipboard
- **Import**: `import { ClipboardRoot, ClipboardLabel, ClipboardControl, ClipboardInput, ClipboardTrigger } from "@/components/ui"`
- **Key Props**: Standard forwardRef props per sub-component
- **Storybook**: `components/ui/clipboard/clipboard.stories.tsx` (Default)

### Combobox
- **Import**: `import { Combobox, ComboboxTrigger, ComboboxInput, ComboboxLabel, ComboboxButton, ComboboxOptions, ComboboxOption, ComboboxPrimitive, comboboxInputVariants, comboboxButtonVariants } from "@/components/ui"`
- **Key Props**: `value?, onChange?, multiple?: boolean, nullable?: boolean, disabled?: boolean, defaultValue?, className?`
- **Variants**: DefaultSm, DefaultSmRightIcon
- **Storybook**: `components/ui/combobox/combobox.stories.tsx` (DefaultSm, DefaultSmRightIcon)

### Command
- **Import**: `import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from "@/components/ui"`
- **Key Props**: CommandDialog extends DialogProps
- **Storybook**: `components/ui/command/command.stories.tsx` (Default)

### CommandPalette
- **Import**: `import { CommandPalette, CommandPaletteTitle, CommandPaletteDialog, CommandPaletteHeader, CommandPaletteDialogClose, CommandPaletteDialogTrigger, CommandPaletteInput, CommandPaletteList, CommandPaletteEmpty, CommandPaletteGroup, CommandPaletteItem, CommandPaletteShortcut, CommandPaletteSeparator, CommandPaletteDialogContent } from "@/components/ui"`
- **Key Props**: `selected: string`, `onSelectedChange?: (value: string) => void`
- **Storybook**: `components/ui/command-palette/command-palette.stories.tsx` (Default)

### CreditDebitCardArticle
- **Import**: `import { CreditDebitCardArticle1, CreditDebitCardArticle, CreditDebitCardArticle2, CreditDebitCardArticle3, CreditCardCvvOrCvc } from "@/components/ui"`
- **Key Props**: `onEdit?: () => void`, `onRemove?: () => void`, `cardNumber?: string`, `saveDefaultPaymentMethod?: boolean`, `onChange?: () => void`
- **Storybook**: N/A

### DatePicker
- **Import**: `import { DatePicker } from "@/components/ui"`
- **Key Props**: `value?: Date`, `onValueChange?: (value: Date) => void`, `placeholder?: string`, `inputClassName?: string`, `indicator?: ReactNode`
- **Storybook**: `components/ui/date-picker/date-picker.stories.tsx` (Default)

### Dialog
- **Import**: `import { Dialog, DialogTrigger, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui"`
- **Key Props**: DialogContent uses `dialogContentVariants` cva; built on Radix DialogPrimitive
- **Storybook**: `components/ui/dialog/dialog.stories.tsx` (Default)

### Dropdown (Popover-based)
- **Import**: `import { DropdownPopover, DropdownPopoverTrigger, DropdownPopoverContent, DropdownCommand, DropdownCommandInput, DropdownCommandEmpty, DropdownCommandGroup, DropdownCommandItem } from "@/components/ui"`
- **Key Props**: `selected?: string | number | Record<string, any> | any[]`, `onSelectedChange?: (...args: any[]) => void`, `multiple?: boolean`
- **Storybook**: `components/ui/dropdown/dropdown.stories.tsx` (Default)

### DropdownMenu
- **Import**: `import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, DropdownMenuRadioCheckItem, DropdownMenuCheckItem, DropdownMenuRadioTrigger } from "@/components/ui"`
- **Key Props**: Built on Radix DropdownMenuPrimitive
- **Variants**: IconsDefault, ChevronDownDefault
- **Storybook**: `components/ui/dropdown-menu/dropdown-menu.stories.tsx` (IconsDefault, ChevronDownDefault)

### Dropzone
- **Import**: `import { Dropzone, SquareShapeDropzone, CircularProgressDropzone, type DropzoneState, type CircularProgressDropzoneState, type Category, ONE_MB } from "@/components/ui"`
- **Key Props**: Dropzone: file upload with progress; SquareShapeDropzone: square variant; CircularProgressDropzone: circular progress variant
- **Variants**: Default, DefaultDestructive, SquareShape, CircularProgress
- **Storybook**: `components/ui/dropzone/dropzone.stories.tsx` (Default, DefaultDestructive)

### Editable
- **Import**: `import { EditableRootProvider, EditableRoot, EditableLabel, EditableArea, EditableInput, EditablePreview, EditableControl, EditableCancelTrigger, EditableSubmitTrigger, EditableEditTrigger } from "@/components/ui"`
- **Key Props**: Built on Ark UI EditablePrimitives
- **Storybook**: `components/ui/editable/editable.stories.tsx` (Default)

### ErrorMessage
- **Import**: `import { ErrorMessage } from "@/components/ui"`
- **Key Props**: Uses `errorMessageVariants` cva; standard span props
- **Storybook**: N/A

### Favorite
- **Import**: `import { Favorite, FavoriteRoot } from "@/components/ui"`
- **Key Props**: FavoriteRoot: `value?: boolean`, `onValueChange?: (value: boolean) => void`, `defaultValue?: boolean`, `children?: (options: { pressed: boolean }) => ReactNode`
- **Storybook**: `components/ui/favorite/favorite.stories.tsx` (Default)

### HelperText
- **Import**: `import { HelperText } from "@/components/ui"`
- **Key Props**: Uses `helperTextVariants` cva; standard span props
- **Storybook**: N/A

### HoverCard
- **Import**: `import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui"`
- **Key Props**: Built on Radix HoverCardPrimitive
- **Storybook**: N/A

### IconButton
- **Import**: `import { IconButton } from "@/components/ui"`
- **Key Props**: `visual?: "primary" | "error" | "gray"`, `variant?: "filled" | "light" | "outlined" | "ghost"`, `size?: "sm" | "md" | "lg" | "xl" | "2xl"`
- **Variants**: 3 visuals x 4 variants x 5 sizes
- **Storybook**: `components/ui/icon-button/icon-button.stories.tsx` (GoogleOutlined)

### ImageEditor / PictureEditor
- **Import**: `import { ImageEditor, PictureEditor } from "@/components/ui"`
- **Key Props**: Internal state for scale, rotate, translate; frame sizes for avatar (238px) and image (324x202)
- **Storybook**: N/A

### Input
- **Import**: `import { Input, inputVariants, InputLeftAddon, InputRightAddon, InputLeftElement, InputRightElement } from "@/components/ui"`
- **Key Props**: `isInvalid?: boolean`; standard input HTML props
- **Variants**: Base, BaseDestructive, LabeledBase
- **Search Input Pattern**: Search inputs have 4 visual states. The width behavior (grow/shrink) is page-specific and not part of this pattern.
  - **InputGroup**: `className="group/search"` (add width/transition classes per page)
  - **Search icon** (InputLeftElement): `<SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />`
  - **Input**: `className="pl-9 pr-9 transition-[border-color] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"`
    - NOTE: Do NOT use `transition-all` — it interpolates box-shadow between `shadow-xs` and the ring, causing a dark flash. Only transition `border-color`.
  - **Clear button** (InputRightElement): `onMouseDown={(e) => e.preventDefault()}` to keep input focused after clearing. Icon: `<XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />`
  - **Default**: border-gray-300 (built-in), shadow-xs (built-in), icon gray-400
  - **Hover**: border-primary-200, glow #E1EAFF, icon gray-500
  - **Active/Focus**: border-primary-500 (built-in), glow #E1EAFF, icon primary-500
  - **Filled**: same as active, typed text in gray-black, clear button (XCircle) at opacity-50 hover:opacity-100
- **Storybook**: `components/ui/input/input.stories.tsx` (Base, BaseDestructive, LabeledBase)

### InputGroup
- **Import**: `import { InputGroup, InputGroupProvider, useInputGroupContext } from "@/components/ui"`
- **Key Props**: Wraps inputs with context provider
- **Storybook**: N/A

### Label
- **Import**: `import { Label, labelVariants } from "@/components/ui"`
- **Key Props**: Uses `labelVariants` cva; standard label HTML props
- **Storybook**: N/A

### Listbox
- **Import**: `import { Listbox, ListboxLabel } from "@/components/ui"`
- **Key Props**: `value?, defaultValue?, onChange?, className?, multiple?: boolean, disabled?: boolean`; generic `<T>` type parameter
- **Storybook**: `components/ui/listbox/listbox.stories.tsx` (Default)

### GoogleMap
- **Import**: `import { GoogleMap } from "@/components/ui"`
- **Key Props**: `location: string`, `latitude?: number`, `longitude?: number`, `title?: string`, `className?: string`
- **Storybook**: N/A

### NumberInput
- **Import**: `import { NumberInput } from "@/components/ui"`
- **Key Props**: `onValueChange?: (value: number) => void`, `value?: number`, `header?`, `min?: number`, `max?: number`, `placeholder?: string`, `groupClassName?: string`, `className?: string`
- **Storybook**: `components/ui/number-input/number-input.stories.tsx` (Default)

### PercentageInput
- **Import**: `import { PercentageInput } from "@/components/ui"`
- **Key Props**: `onValueChange?: (value: number) => void`, `value?: number`, `header?`, `min?: number`, `max?: number`, `placeholder?: string`, `groupClassName?: string`, `className?: string`
- **Storybook**: `components/ui/percentage-input/percentage-input.stories.tsx` (Default)

### PinInput
- **Import**: `import { FourDigitPinInput, SixDigitPinInput } from "@/components/ui"`
- **Key Props**: `placeholder?: string`, `pinInputClassName?: string`
- **Variants**: FourDigit, SixDigit, LabeledFourDigit, LabeledHelperTextFourDigit, HelperTextFourDigit, LabeledSixDigit, LabeledHelperTextSixDigit
- **Storybook**: `components/ui/pin-input/pin-input.stories.tsx` (FourDigit, SixDigit, LabeledFourDigit, LabeledHelperTextFourDigit, HelperTextFourDigit, LabeledSixDigitPinInput, LabeledHelperTextSixDigitPinInput)

### Popover
- **Import**: `import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui"`
- **Key Props**: Built on Radix PopoverPrimitive
- **Storybook**: `components/ui/popover/popover.stories.tsx` (Default)

### Progress
- **Import**: `import { Progress, CircularProgress } from "@/components/ui"`
- **Key Props**: Progress: linear bar; CircularProgress: circular with size variants
- **Variants**: CircularXs, CircularSm, CircularMd, CircularLg, CircularXl, Linear
- **Storybook**: `components/ui/progress/progress.stories.tsx` (CircularXs, CircularSm, CircularMd, CircularLg, CircularXl, Linear)

### RadioGroup
- **Import**: `import { RadioGroup, RadioGroupItem, HeadlessRadioGroupItem, RadioGroupItemSelector } from "@/components/ui"`
- **Key Props**: RadioGroupItem: size variants via cva; RadioGroupItemSelector: selector-style variant
- **Variants**: SmLabel, MdLabel, LgLabel
- **Storybook**: `components/ui/radio-group/radio-group.stories.tsx` (SmLabel, MdLabel, LgLabel)

### RatingGroup
- **Import**: `import { RatingGroupRoot, RatingGroupLabel, RatingGroupControl, RatingGroupItem, RatingGroupContext, RatingGroupItemContext, RatingGroupHiddenInput } from "@/components/ui"`
- **Key Props**: Built on Ark UI RatingGroup primitives
- **Storybook**: `components/ui/rating-group/rating-group.stories.tsx` (Default)

### Reorder
- **Import**: `import { ReorderGroup, ReorderItem } from "@/components/ui/reorder"`
- **Note**: Not re-exported from `@/components/ui` barrel; import from `@/components/ui/reorder` directly
- **Key Props**: ReorderGroup: `onReorder: (newOrder: any[]) => void`, `values: T[]`, `axis?: "y" | "x"`; ReorderItem: `value: T`, `className?`
- **Storybook**: N/A

### RmDialog
- **Import**: `import { RmDialog } from "@/components/ui"`
- **Key Props**: `trigger?`, `open?: boolean`, `onOpenChange?: (open: boolean) => void`, `title?: string`, `description?: string`, `onRemove?: () => void`
- **Storybook**: N/A

### RoundedButton
- **Import**: `import { RoundedButton } from "@/components/ui"`
- **Key Props**: Uses `roundedButtonVariants` cva
- **Variants**: Primary, Secondary
- **Storybook**: `components/ui/rounded-button/rounded-button.stories.tsx` (Primary, Secondary)

### ScrollArea
- **Import**: `import { ScrollArea, ScrollBar, ScrollAreaScrollbar, ScrollAreaThumb } from "@/components/ui"`
- **Directory**: `scroll-aria` (sic)
- **Key Props**: Built on Radix ScrollAreaPrimitive
- **Variants**: Default, ScrollVariant, AlwaysVariant
- **Storybook**: `components/ui/scroll-aria/scroll-aria.stories.tsx` (Default, ScrollVariant, AlwaysVariant)

### SearchField
- **Import**: `import { SearchField, SearchFieldInput, SearchFieldButton } from "@/components/ui"`
- **Key Props**: Context-based search field with input and button sub-components
- **Variants**: DefaultSm, DefaultSmRightIcon, DefaultLg, DefaultLgRightIcon, GraySm, GraySmRightIcon
- **Storybook**: `components/ui/search-field/search-field.stories.tsx` (DefaultSm, DefaultSmRightIcon, DefaultLg, DefaultLgRightIcon, GraySm, GraySmRightIcon)

### Select
- **Import**: `import { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, HeadlessSelectTrigger, HeadlessSelectIcon } from "@/components/ui"`
- **Key Props**: Built on Radix SelectPrimitive
- **Storybook**: N/A

### Sidebar (UI)
- **Import**: `import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarItem } from "@/components/ui"`
- **Key Props**: SidebarItem is a forwardRef component; others are standard div wrappers
- **Storybook**: N/A

### Slider
- **Import**: `import { Slider, SliderRoot, SliderTrack, SliderThumb, SliderRange } from "@/components/ui"`
- **Key Props**: Standard slider props; Slider is a composed version, SliderRoot/Track/Thumb/Range are primitives
- **Storybook**: `components/ui/slider/slider.stories.tsx` (Default)

### Spinner
- **Import**: `import { Spinner, SpinnerPositioner } from "@/components/ui"`
- **Key Props**: `size?: number`, `strokeWidth?: number`, `value?: number`, `trackClassName?: string`, `className?: string`
- **Variants**: Default, Positioned
- **Storybook**: `components/ui/spinner/spinner.stories.tsx` (Default, Positioned)

### CheckoutStep
- **Import**: `import { CheckoutStep } from "@/components/ui"`
- **Key Props**: `disabled?: boolean`, `label?: string`, `index: number`
- **Storybook**: N/A

### StepIndicator
- **Import**: `import { StepIndicator } from "@/components/ui"`
- **Key Props**: `disabled?: boolean`, `index: number`, `state?: "active" | "disabled"`, `className?: string`
- **Storybook**: N/A

### Stepper
- **Import**: `import { StepperProvider, useStepperContext, StepRootProvider, useStepRootContext, StepControl, StepProvider, useStepContext, Step } from "@/components/ui"`
- **Key Props**: StepperContext: `nextStep, prevStep, setStep, toggleStepValidation`; StepRootContext: `hasPreviousStep, hasNextStep, currentStep, totalSteps, stepsState`; StepContext: `toggleValidation, index, status ("completed" | "incomplete" | "active")`
- **Storybook**: N/A

### Switch
- **Import**: `import { Switch } from "@/components/ui"`
- **Key Props**: Standard switch props with size variants
- **Variants**: Sm, Md, Lg; with/without label
- **Storybook**: `components/ui/switch/switch.stories.tsx` (Sm, Md, Lg, SmLabel)

### Table
- **Import**: `import { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from "@/components/ui"`
- **Key Props**: Standard HTML table element wrappers; works with `@tanstack/react-table` columnHelper
- **Sortable Columns**: For sortable column headers, use the following pattern:
  - Add `className="cursor-pointer select-none group/sort"` and an `onClick` handler to the `TableHead`
  - Inside, wrap the label and arrow icon in `<div className="inline-flex items-center gap-x-1">`
  - When **unsorted**: show `<ArrowDown className="h-4 w-4 opacity-0 group-hover/sort:opacity-50 transition-opacity duration-300" />` (hidden by default, fades in at 50% on hover to indicate sortability)
  - When **sorted asc**: show `<ArrowUp className="h-4 w-4" />` at full opacity
  - When **sorted desc**: show `<ArrowDown className="h-4 w-4" />` at full opacity
  - Non-sortable columns should have no arrow icon, no cursor-pointer, and no group class
  - Icons: `import { ArrowDown, ArrowUp } from "@blend-metrics/icons"`
- **Storybook**: `components/ui/table/table.stories.tsx` (Default)

### Tabs
- **Import**: `import { Tabs, TabsList, TabsTrigger, TabsContent, DisclosureTrigger, contentVariants, contentTransition } from "@/components/ui"`
- **Key Props**: `value: string`, `onValueChange: (value: string) => void`, `unanimated?: boolean`; animated content transitions
- **Variants**: Base, Expanded, Icons
- **Storybook**: `components/ui/tabs/tabs.stories.tsx` (Base, Expanded, Icons)

### TagsInput
- **Import**: `import { TagsInputRoot, TagsInputLabel, TagsInputControl, TagsInputItem, TagsInputItemPreview, TagsInputItemText, TagsInputItemDeleteTrigger, TagsInputItemInput, TagsInputInput, TagsInputClearTrigger } from "@/components/ui"`
- **Key Props**: Built on Ark UI TagsInput primitives
- **Storybook**: N/A

### TextInput
- **Import**: `import { TextInput } from "@/components/ui"`
- **Key Props**: `type?: "email" | "password" | "search" | "tel" | "text" | "url"`, `onValueChange?: (value: string) => void`, `value?: string`, `validate?: (value: string) => boolean`
- **Storybook**: `components/ui/text-input/text-input.stories.tsx` (Default)

### Textarea
- **Import**: `import { Textarea } from "@/components/ui"`
- **Key Props**: `isInvalid?: boolean`; extends standard `TextareaHTMLAttributes`
- **Variants**: Base, LabeledBase, HelperTextBase, LabeledHelperTextBase
- **Storybook**: `components/ui/textarea/textarea.stories.tsx` (Base, LabeledBase, HelperTextBase, LabeledHelperTextBase)

### TimeField
- **Import**: `import { TimeField, TimeFieldLabel, TimeFieldInput, TimeFieldSegment } from "@/components/ui"`
- **Key Props**: Time input with segmented fields (hours, minutes, AM/PM)
- **Storybook**: `components/ui/time-field/time-field.stories.tsx` (Default)

### Toast
- **Import**: `import { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction, Toaster, type ToastProps, type ToastActionElement } from "@/components/ui"`
- **Hook**: `import { useToast, toast } from "@/components/ui"` (from `use-toast` re-export)
- **Key Props**: `id, title?, description?, action?`; toastVariants cva for styling
- **Storybook**: `components/ui/toast/toast.stories.tsx` (Default, Success)

### Toggle
- **Import**: `import { Toggle } from "@/components/ui"`
- **Key Props**: Built on Radix TogglePrimitive.Root
- **Storybook**: N/A

### ToggleGroup
- **Import**: `import { ToggleGroup, ToggleGroupRoot, ToggleGroupItem } from "@/components/ui"`
- **Key Props**: ToggleGroupRoot and ToggleGroupItem are forwardRef components
- **Storybook**: `components/ui/toggle-group/toggle-group.stories.tsx` (Default)

### Tooltip
- **Import**: `import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow } from "@/components/ui"`
- **Key Props**: TooltipContent uses `tooltipContentVariants` cva; built on Radix TooltipPrimitive
- **Variants**: Sm, Md
- **Storybook**: `components/ui/tooltip/tooltip.stories.tsx` (Sm, Md)

### Transitions
- **Import**: `import { TileTransition, ScaleOutIn } from "@/components/ui"`
- **Key Props**: Animation wrapper components (forwardRef)
- **Storybook**: N/A

---

## SECTION 2: Shared Components & Modules

These are reusable composed modules built from base UI components. Located at `frontend/components/*.tsx`.

---

### AccountNotFoundShowcase
- **File**: `account-not-found-showcaset.tsx` (sic)
- **Import**: `import { AccountNotFoundShowcase } from "@/components/account-not-found-showcaset"`
- **Exports**: `AccountNotFoundShowcase`

### AccountSidebars
- **File**: `account-sidebars.tsx`
- **Import**: `import { ... } from "@/components/account-sidebars"`
- **Exports**: Sidebar navigation components for account pages; uses `SidebarItem` type with badge formatting
- **Dependencies**: NextLink, Badge, IconButton, useInboxThreads

### ActiveSessionsModal
- **File**: `active-sessions-modal.tsx`
- **Import**: `import { ... } from "@/components/active-sessions-modal"`
- **Exports**: Session management modal showing active devices (Monitor, Smartphone, Tablet)
- **Dependencies**: AuthAPI, device icons, cookies

### AddManualTimeDialog
- **File**: `add-manual-time-dialog.tsx`
- **Import**: `import { AddManualTimeDialog } from "@/components/add-manual-time-dialog"`
- **Exports**: `AddManualTimeDialog`
- **Key Props**: Dialog for manual time entry with contract/task selection
- **Constants**: `MAX_DURATION_HOURS = 12`, `MAX_PAST_DAYS = 90`, `MAX_NOTES_LENGTH = 500`

### AllTeamMembersGrid
- **File**: `all-team-members-grid.tsx`
- **Import**: `import { AllTeamMembersGrid } from "@/components/all-team-members-grid"`
- **Exports**: `AllTeamMembersGrid`
- **Key Props**: `AllTeamMembersGridProps` interface

### BillingSectionHeader
- **File**: `billing-section-header.tsx`
- **Import**: `import { billingTabs, type BillingTabValue, getActiveBillingTab } from "@/components/billing-section-header"`
- **Exports**: `billingTabs`, `BillingTabValue`, `getActiveBillingTab`
- **Dependencies**: Tabs, TabsList, TabsTrigger, useRouter, usePathname

### BillingTransactionsContent
- **File**: `billing-transactions-content.tsx`
- **Import**: `import { BillingTransactionsContent } from "@/components/billing-transactions-content"`
- **Exports**: `BillingTransactionsContent`

### Blocks / Blocks1
- **File**: `blocks.tsx` / `blocks-1.tsx`
- **Import**: `import { Blocks } from "@/components/blocks"` / `import { Blocks1 } from "@/components/blocks-1"`
- **Exports**: `Blocks`, `Blocks1` (SVG icon components)

### CalBookingButton
- **File**: `cal-booking-button.tsx`
- **Import**: `import { ... } from "@/components/cal-booking-button"`
- **Exports**: Cal.com booking integration button
- **Key Props**: Extends `ButtonProps`; embeds Cal.com modal for "deep-dive-discovery-call"

### CaseStudyBuilder
- **File**: `case-study-builder.tsx`
- **Import**: `import { ... } from "@/components/case-study-builder"`
- **Exports**: Case study editing components with reducer-based state

### CategoryBanner
- **File**: `category-banner.tsx`
- **Import**: `import { CategoryBanner } from "@/components/category-banner"`
- **Exports**: `CategoryBanner`
- **Key Props**: `CategoryBannerProps` interface

### Chat
- **File**: `chat.tsx`
- **Import**: `import { ... } from "@/components/chat"`
- **Exports**: Chat UI components (bubbles, message input, online status)
- **Dependencies**: apiFetch, auth, conversations, Ably online users, cva, date-fns

### CheckoutNavigation
- **File**: `checkout-navigation.tsx`
- **Import**: `import { ... } from "@/components/checkout-navigation"`
- **Exports**: Checkout step navigation with StepIndicator
- **Key Props**: `CheckoutStepNumber = 1 | 2 | 3`

### CounterOfferDialog
- **File**: `counter-offer-dialog.tsx`
- **Import**: `import { ... } from "@/components/counter-offer-dialog"`
- **Exports**: `CounterOfferDialogVariant`, `CounterOfferDialogProps`
- **Key Props**: Dialog for counter-offering on proposals

### CreditCardInput
- **File**: `credit-card-input.tsx`
- **Import**: `import { Visa, ... } from "@/components/credit-card-input"`
- **Exports**: `Visa` (SVG), Mastercard detection, credit card input with auto-formatting

### DashboardAmount
- **File**: `dashboard-amount.tsx`
- **Import**: `import { DashboardAmount } from "@/components/dashboard-amount"`
- **Exports**: `DashboardAmount`

### DashboardFooter
- **File**: `dashboard-footer.tsx`
- **Import**: `import { DashboardFooter } from "@/components/dashboard-footer"`
- **Exports**: `DashboardFooter`
- **Key Props**: `className?: string`; social icons (Instagram, Facebook, LinkedIn, X)

### EditProfileModals
- **File**: `edit-profile-modals.tsx`
- **Import**: `import { ... } from "@/components/edit-profile-modals"`
- **Exports**: Profile editing modal components (about, experience, education, skills, certifications)
- **Dependencies**: react-hook-form, zod, date-fns, CurrencyInput, UserAPI

### EmojiPicker
- **File**: `emoji-picker.tsx`
- **Import**: `import { ... } from "@/components/emoji-picker"`
- **Exports**: Emoji picker with category tabs and search

### HireMeButton
- **File**: `hire-me-button.tsx`
- **Import**: `import { ... } from "@/components/hire-me-button"`
- **Exports**: Hire me CTA button

### InboxComps
- **File**: `inbox-comps.tsx`
- **Import**: `import { EditContextProvider, useEditContext } from "@/components/inbox-comps"`
- **Exports**: `EditContextProvider`, `useEditContext`

### InviteWindow
- **File**: `invite-window.tsx`
- **Import**: `import { ... } from "@/components/invite-window"`
- **Exports**: Team/project invitation window

### LikeDislike
- **File**: `like-dislike.tsx`
- **Import**: `import { LikeDislike } from "@/components/like-dislike"`
- **Exports**: `LikeDislike`

### ListingCard
- **File**: `listing-card.tsx`
- **Import**: `import { ... } from "@/components/listing-card"`
- **Exports**: Project/service listing card

### ListingCardCompact
- **File**: `listing-card-compact.tsx`
- **Import**: `import { ListingCardCompact } from "@/components/listing-card-compact"`
- **Exports**: `ListingCardCompact`
- **Key Props**: `ListingCardCompactProps` interface

### MagicLinkSentShowcase
- **File**: `magic-link-sent-showcase.tsx`
- **Import**: `import { MagicLinkSentShowcase } from "@/components/magic-link-sent-showcase"`
- **Exports**: `MagicLinkSentShowcase`

### MarketeqIcon1
- **File**: `marketeq-icon-1.tsx`
- **Import**: `import { MarketeqIcon1 } from "@/components/marketeq-icon-1"`
- **Exports**: `MarketeqIcon1` (SVG icon)

### MarketplaceFooter
- **File**: `marketplace-footer.tsx`
- **Import**: `import { ... } from "@/components/marketplace-footer"`
- **Exports**: Marketplace page footer
- **Key Props**: `MarketplaceFooterProps` type

### Money
- **File**: `money.tsx`
- **Import**: `import { Money } from "@/components/money"`
- **Exports**: `Money` (SVG icon)

### MoreInfoForm
- **File**: `more-info-form.tsx`
- **Import**: `import { ... } from "@/components/more-info-form"`
- **Exports**: Additional profile info form

### NProgressBar
- **File**: `n-progress-bar.tsx`
- **Import**: `import { NProgressBar } from "@/components/n-progress-bar"`
- **Exports**: `NProgressBar` (page transition progress bar)

### NavigationForm
- **File**: `navigation-form.tsx`
- **Import**: `import { NavigationForm, type SessionChoice } from "@/components/navigation-form"`
- **Exports**: `NavigationForm`, `SessionChoice` (`"stay-logged-in" | "sign-out-others"`)

### NextImage
- **File**: `next-image.tsx`
- **Import**: `import NextImage from "@/components/next-image"`
- **Exports**: `NextImage` (default export, forwardRef wrapper around Next.js Image)

### NextLink
- **File**: `next-link.tsx`
- **Import**: `import NextLink from "@/components/next-link"`
- **Exports**: `NextLink` (default export, forwardRef wrapper around Next.js Link)

### NotificationPreferences
- **File**: `notification-preferences.tsx`
- **Import**: `import NotificationPreferences from "@/components/notification-preferences"`
- **Exports**: `NotificationPreferences` (default export)

### OfferFlowDialog
- **File**: `offer-flow-dialog.tsx`
- **Import**: `import { OfferFlowDialog, type OfferFlowDialogVariant } from "@/components/offer-flow-dialog"`
- **Exports**: `OfferFlowDialogVariant`, `OfferFlowDialogProps`

### OfferHistoryDialog
- **File**: `offer-history-dialog.tsx`
- **Import**: `import { OfferHistoryDialog } from "@/components/offer-history-dialog"`
- **Exports**: `OfferHistoryDialog`
- **Key Props**: `OfferHistoryDialogProps` interface

### OwnCombobox
- **File**: `own-combobox.tsx`
- **Import**: `import { Command, CommandDialog } from "@/components/own-combobox"`
- **Exports**: `Command`, `CommandDialog` (custom combobox implementation)

### PhoneNumberInput
- **File**: `phone-number-input.tsx`
- **Import**: `import { PhoneNumberInput, phoneUtil, isPhoneValid } from "@/components/phone-number-input"`
- **Exports**: `PhoneNumberInput`, `phoneUtil`, `isPhoneValid`
- **Key Props**: Generic `<TFormValues extends FieldValues>` for react-hook-form integration

### ReadMoreLess
- **File**: `read-more-less.tsx`
- **Import**: `import { ReadMoreLess, ReadMoreLessRoot } from "@/components/read-more-less"`
- **Exports**: `ReadMoreLess`, `ReadMoreLessRoot`

### ResetPasswordForm
- **File**: `reset-password-form.tsx`
- **Import**: `import { ResetPasswordForm } from "@/components/reset-password-form"`
- **Exports**: `ResetPasswordForm`

### RichTextEditor
- **File**: `rich-text-editor.tsx`
- **Import**: `import { ... } from "@/components/rich-text-editor"`
- **Exports**: Rich text editor component

### SaveTalentButton
- **File**: `save-talent-button.tsx`
- **Import**: `import { SaveTalentButton } from "@/components/save-talent-button"`
- **Exports**: `SaveTalentButton`
- **Key Props**: `userId: string`

### SearchCard
- **File**: `search-card.tsx`
- **Import**: `import { SearchCard } from "@/components/search-card"`
- **Exports**: `SearchCard`

### SearchCardLandscape
- **File**: `search-card-landscape.tsx`
- **Import**: `import { SearchCardLandscape } from "@/components/search-card-landscape"`
- **Exports**: `SearchCardLandscape`

### SecuritySettings
- **File**: `security-settings.tsx`
- **Import**: `import { ... } from "@/components/security-settings"`
- **Exports**: Security settings panel (password, 2FA, sessions)

### SettingsSidebar
- **File**: `settings-sidebar.tsx`
- **Import**: `import SettingsSidebar, { settingsTabItems, type SettingsTabId } from "@/components/settings-sidebar"`
- **Exports**: `SettingsSidebar` (default), `settingsTabItems`, `SettingsTabId`

### ShowMoreLess
- **File**: `show-more-less.tsx`
- **Import**: `import { ShowMoreLessRoot, ShowMoreLessRootProvider, useShowMoreLessRootContext } from "@/components/show-more-less"`
- **Exports**: `ShowMoreLessRoot`, `ShowMoreLessRootProvider`, `useShowMoreLessRootContext`

### Swiper
- **File**: `swiper.tsx`
- **Import**: `import { SwiperRoot, ... } from "@/components/swiper"`
- **Exports**: `SwiperRoot` and swiper context

### TalentCardLandscape
- **File**: `talent-card-landscape.tsx`
- **Import**: `import { TalentCardLandscape } from "@/components/talent-card-landscape"`
- **Exports**: `TalentCardLandscape`

### TalentDashboardComps
- **File**: `talent-dashboard-comps.tsx`
- **Import**: `import { ... } from "@/components/talent-dashboard-comps"`
- **Exports**: Talent dashboard UI sub-components

### TalentProfileCard
- **File**: `talent-profile-card.tsx`
- **Import**: `import { ... } from "@/components/talent-profile-card"`
- **Exports**: Talent profile card; uses `TalentProfile` interface

### TalentProfileComps
- **File**: `talent-profile-comps.tsx`
- **Import**: `import { ... } from "@/components/talent-profile-comps"`
- **Exports**: Talent profile sub-components (sections, skills, experience)

### TalentSearchCard
- **File**: `talent-search-card.tsx`
- **Import**: `import { ... } from "@/components/talent-search-card"`
- **Exports**: Talent search result card with default skills array

### TalentSearchCardLandscape
- **File**: `talent-search-card-landscape.tsx`
- **Import**: `import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"`
- **Exports**: `TalentSearchCardLandscape`
- **Key Props**: `TalentSearchCardLandscapeProps` interface

### ThreeHorizontalLines
- **File**: `three-horizontal-lines.tsx`
- **Import**: `import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"`
- **Exports**: `ThreeHorizontalLines` (SVG icon)

### ThumbsDown
- **File**: `thumbs-down.tsx`
- **Import**: `import { ... } from "@/components/thumbs-down"`
- **Exports**: `ThumbsDownToggle`

### ThumbsUp
- **File**: `thumbs-up.tsx`
- **Import**: `import { ... } from "@/components/thumbs-up"`
- **Exports**: `ThumbsUpToggle`

### TimezoneSync
- **File**: `timezone-sync.tsx`
- **Import**: `import { ... } from "@/components/timezone-sync"`
- **Exports**: Background timezone sync component
- **Constants**: `SYNC_TTL_MS = 6h`, `CHECK_INTERVAL_MS = 15m`

### TransactionsComps
- **File**: `transactions-comps.tsx`
- **Import**: `import { ... } from "@/components/transactions-comps"`
- **Exports**: Transaction list/table sub-components

### Triangles
- **File**: `triangles.tsx`
- **Import**: `import { Triangles } from "@/components/triangles"`
- **Exports**: `Triangles` (SVG decorative element)

### TwoFactorSetup
- **File**: `two-factor-setup.tsx`
- **Import**: `import { ... } from "@/components/two-factor-setup"`
- **Exports**: OTP input and 2FA setup flow

### UpdatePasswordForm
- **File**: `update-password-form.tsx`
- **Import**: `import { ... } from "@/components/update-password-form"`
- **Exports**: Password update form with zod validation

### WithdrawFundsDialog
- **File**: `withdraw-funds-dialog.tsx`
- **Import**: `import { ... } from "@/components/withdraw-funds-dialog"`
- **Exports**: Multi-step withdrawal dialog (amount, method, summary, verify)
- **Steps**: `"amount" | "method" | "summary" | "verify"`

---

## SECTION 3: Page-Level Storybook Components

These are full page layouts and complex multi-section components defined in Storybook. They are the SOURCE OF TRUTH for page layouts. Located at `frontend/stories/*.stories.tsx`.

---

### Ask Question
- **File**: `stories/ask-question.stories.tsx`
- **Storybook Title**: "Ask Question"
- **Stories**: `SignUp`

### Authentication
- **File**: `stories/auth.stories.tsx`
- **Storybook Title**: "Authentication"
- **Stories**: `SignUp`

### Case Study Builder Comps
- **File**: `stories/case-study-builder-comps.stories.tsx`
- **Storybook Title**: "Case Study Builder Comps"
- **Stories**: `Toolbar`, `BlockToolbar`, `BlockImageToolbar`, `ToBeAdded`, `FlexibleToolbar`, `InitialBlock`, `TemplateDialog`, `Addened`, `BlockWithCols`, `SplitCard`, `ClientView`, `EditingPlayground`

### Categories L1
- **File**: `stories/categories-l1.stories.tsx`
- **Storybook Title**: "Categories-L1"
- **Stories**: `Default`

### Categories L1 - Projects
- **File**: `stories/categories-l1-projects.stories.tsx`
- **Storybook Title**: "Categories-L1/Projects"
- **Stories**: `Default`

### Categories L1 - Services
- **File**: `stories/categories-l1-services.stories.tsx`
- **Storybook Title**: "Categories-L1/Services"
- **Stories**: `Default`

### Categories L1 - Talent
- **File**: `stories/categories-l1-talent.stories.tsx`
- **Storybook Title**: "Categories-L1/Talent"
- **Stories**: `Default`

### Categories L1 - Teams
- **File**: `stories/categories-l1-teams.stories.tsx`
- **Storybook Title**: "Categories-L1/Teams"
- **Stories**: `Default`

### Categories L2
- **File**: `stories/categories-l2.stories.tsx`
- **Storybook Title**: "Categories-L2"
- **Stories**: `Default`

### Categories L2 - Projects
- **File**: `stories/categories-l2-projects.stories.tsx`
- **Storybook Title**: "Categories-L2/Projects"
- **Stories**: `Default`

### Categories L2 - Services
- **File**: `stories/categories-l2-services.stories.tsx`
- **Storybook Title**: "Categories-L2/Services"
- **Stories**: `Default`

### Categories L2 - Talent
- **File**: `stories/categories-l2-talent.stories.tsx`
- **Storybook Title**: "Categories-L2/Talent"
- **Stories**: `Default`

### Categories L2 - Teams
- **File**: `stories/categories-l2-teams.stories.tsx`
- **Storybook Title**: "Categories-L2/Teams"
- **Stories**: `Default`

### Categories L3
- **File**: `stories/categories-l3.stories.tsx`
- **Storybook Title**: "Categories-L3"
- **Stories**: `Default`

### Categories L3 - Projects
- **File**: `stories/categories-l3-projects.stories.tsx`
- **Storybook Title**: "Categories-L3/Projects"
- **Stories**: `Default`

### Categories L3 - Talent
- **File**: `stories/categories-l3-talent.stories.tsx`
- **Storybook Title**: "Categories-L3/Talent"
- **Stories**: `Default`

### Categories L3 - Teams
- **File**: `stories/categories-l3-teams.stories.tsx`
- **Storybook Title**: "Categories-L3/teams"
- **Stories**: `Default`

### Checkout
- **File**: `stories/checkout.stories.tsx`
- **Storybook Title**: "Checkout"
- **Stories**: `StepIndicator`, `Step`, `UserGroup`, `Navigation`, `ProjectDetails`, `Visa`, `Discover`, `Amex`, `ACH`, `AvailableBalance`, `EditScope`, `AddTask`, `EditTeam`, `ReplaceTeamMember`

### Client Onboarding
- **File**: `stories/client-onboarding.stories.tsx`
- **Storybook Title**: "Client Onboarding"
- **Stories**: `Default`, `DescribeYourTeam`, `ShareYourGoals`, `InviteYourTeam`, `CreateYourUsername`, `OutlineYourInterests`, `LastStep`

### Client View Components
- **File**: `stories/client-view-comps.stories.tsx`
- **Storybook Title**: "Client View Components"
- **Stories**: `Card`

### Complete My Profile
- **File**: `stories/complete-my-profile.stories.tsx`
- **Storybook Title**: "Complete My Profile"
- **Stories**: `Default`, `StatusDialog`, `MoreInfoDialog`, `AboutMeDialog`, `SkillsDialog`, `WorkExperienceDialog`, `EducationDialog`, `Portfolio`, `Congratulations`, `SaveWorkEducation`, `DeleteWorkExperience`, `SaveEducationQualification`, `DeleteEducation`, `WorkExperienceCard`, `EducationCard`

### Complete My Profile Implementation
- **File**: `stories/complete-my-profile-implementation.stories.tsx`
- **Storybook Title**: "Complete My Profile Implementation"
- **Stories**: `AboutMeDialog`, `MoreInfoDialog`, `Availability`, `WorkExperienceDialog`, `EducationDialog`, `Languages`, `Skills`, `IndustryExpertise`, `Certifications`, `AffiliatedTeams`, `AffiliatedTeams1`, `MyOffers`

### Counter Offer Dialog
- **File**: `stories/counter-offer-dialog.stories.tsx`
- **Storybook Title**: "Counter Offer Dialog"
- **Stories**: `Default`, `RateDropdownCustom`, `CustomRate`, `DurationDropdownCustom`, `DurationDropdownSelected`, `RateDropdownSelected`, `CustomDuration`

### Desktop Time Tracker
- **File**: `stories/desktop-tracker.stories.tsx`
- **Storybook Title**: "Desktop Time Tracker"
- **Stories**: `AppIdle`, `AppTracking`, `AppWithTasks`, `AllTasksView`, `NewTask`, `AccountMenuStory`, `CompactTimerIdle`, `CompactTimerActive`, `SearchStates`, `TimerDisplayLarge`, `TimerDisplaySmall`, `TimerControlsIdle`, `TimerControlsActive`, `ContractEntryCollapsed`, `ContractEntryEmpty`, `ContractEntryWithTasks`

### Emoji Picker
- **File**: `stories/emoji-picker.stories.tsx`
- **Storybook Title**: "EmojiPicker"
- **Stories**: `Default`

### File Attachments
- **File**: `stories/file-attachments.stories.tsx`
- **Storybook Title**: "File Attachments"
- **Stories**: `Default`

### Inbox
- **File**: `stories/inbox.stories.tsx`
- **Storybook Title**: "Inbox"
- **Stories**: `Bubble`, `YourBubble`, `ChatDefault`, `ChatActive`, `BubbleWithPicture`, `BubbleWithLink`, `BubbleWithLinkBlack`
- **Exports**: `EditContextProvider`, `useEditContext` (also used by inbox-comps.tsx)

### Message Forwarding
- **File**: `stories/message-forwarding.stories.tsx`
- **Storybook Title**: "Message Forwarding"
- **Stories**: `MessageForwardingLimitDialog`

### Offer Flow Dialog
- **File**: `stories/offer-flow-dialog.stories.tsx`
- **Storybook Title**: "Offer Flow Dialog"
- **Stories**: `OfferDetails`, `AcceptOfferEmpty`, `AcceptOfferReady`, `DeclineOfferEmpty`, `DeclineOfferReady`

### Offer History Dialog
- **File**: `stories/offer-history-dialog.stories.tsx`
- **Storybook Title**: "Offer History Dialog"
- **Stories**: `Collapsed`, `Expanded`

### Pay in Installments
- **File**: `stories/pay-in-installaments.stories.tsx` (sic)
- **Storybook Title**: "Pay in Installments"
- **Stories**: `BankCardSelected`, `CreditDebitSelected`

### Project Details
- **File**: `stories/project-details.stories.tsx`
- **Storybook Title**: "Project Details"
- **Stories**: `Default`

### Project Details - Steps Section
- **File**: `stories/project-details-steps-section.stories.tsx`
- **Storybook Title**: "Project details / Steps section"
- **Stories**: `FromGatewayFixture`, `DefaultViewModel`, `FromMergedGatewayPayload`

### Publish Project
- **File**: `stories/publish-project.stories.tsx`
- **Storybook Title**: "PublishProject"
- **Stories**: `Sidebar`, `Header`, `BottomBar`, `ProjectInfo`, `Media`, `ProjectScopeTip`, `ProjectScope`, `PublishMarketPlaceEmptyState`, `PhaseName`, `TaskName`, `Duration`, `DeletePhase`, `SaveExit`, `Empty1`, `Empty2`, `Empty3`

### Sidebar (Page-Level)
- **File**: `stories/sidebar.stories.tsx`
- **Storybook Title**: "Sidebar"
- **Stories**: `Sidebar`, `Sidebar1`, `Sidebar2`, `Sidebar3`, `Sidebar4`, `Sidebar5`, `Sidebar6`, `ConfirmationScreen`, `ThankYou`, `NextSteps`

### Similar Projects
- **File**: `stories/similar-projects.stories.tsx`
- **Storybook Title**: "Similar Projects"
- **Stories**: `Default`

### Talent Onboarding
- **File**: `stories/talent-onboarding.stories.tsx`
- **Storybook Title**: "Talent Onboarding"
- **Stories**: `IntroduceYourself`, `CreateYourUsername`, `ShareYourLocation`, `ShowcaseYourTalent`, `SetYourPreferences`, `LastStep`

### Talent Profile
- **File**: `stories/talent-profile.stories.tsx`
- **Storybook Title**: "Talent Profile"
- **Stories**: `Default`, `Offers`

### Talent Profile 1
- **File**: `stories/talent-profile-1.stories.tsx`
- **Storybook Title**: "Talent Profile 1"
- **Stories**: `Layout`, `TopMostHeader`, `SaveButton`, `SectionSearchBar`, `Default`, `Offers`

### Talent Profile 2
- **File**: `stories/talent-profile-2.stories.tsx`
- **Storybook Title**: "Talent Profile 2"
- **Stories**: `Default`, `Offers`

### Talent Profile Components
- **File**: `stories/talent-profile-comps.stories.tsx`
- **Storybook Title**: "Talent Profile Components"
- **Stories**: `Footer`, `Sidebar`, `Layout`, `SearchBar`, `TopMostHeader`, `SaveButton`, `SectionSearchBar`

### Time Selector
- **File**: `stories/time-selector.stories.tsx`
- **Storybook Title**: "Time Selector"
- **Stories**: `Default`

### Video Player Modal
- **File**: `stories/video-player-modal.stories.tsx`
- **Storybook Title**: "Video Player Modal"
- **Stories**: `Default`
