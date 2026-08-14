# COMPONENTS.md -- Marketeq Design System Catalog

> **RULE: NEVER build custom UI components. ONLY use existing components from `@/components/ui`. ONLY use existing Tailwind classes. Always search this catalog and Storybook first. Zero exceptions.**

This file catalogs every component in the design system at `frontend/components/ui/`. Use this as the definitive reference before building any UI.

---

## Table of Contents

- [Accordion](#accordion)
- [Alert](#alert)
- [ApplePayCard / GooglePayCard](#applepaycard--googlepaycard)
- [Autocomplete](#autocomplete)
- [Avatar](#avatar)
- [AvatarGroup](#avatargroup)
- [Badge](#badge)
- [BadgeGroup](#badgegroup)
- [Breadcrumb](#breadcrumb)
- [Button](#button)
- [ButtonGroup](#buttongroup)
- [Calendar](#calendar)
- [Card](#card)
- [Carousel](#carousel)
- [Checkbox](#checkbox)
- [CheckboxGroup](#checkboxgroup)
- [Clipboard](#clipboard)
- [Combobox](#combobox)
- [Command](#command)
- [CommandPalette](#commandpalette)
- [CreditDebitCardArticle](#creditdebitcardarticle)
- [DatePicker](#datepicker)
- [Dialog](#dialog)
- [Dropdown](#dropdown)
- [DropdownMenu](#dropdownmenu)
- [Dropzone](#dropzone)
- [Editable](#editable)
- [ErrorMessage](#errormessage)
- [Favorite](#favorite)
- [HelperText](#helpertext)
- [HoverCard](#hovercard)
- [IconButton](#iconbutton)
- [ImageEditor](#imageeditor)
- [Input](#input)
- [InputGroup](#inputgroup)
- [Label](#label)
- [Listbox](#listbox)
- [Map (GoogleMap)](#map-googlemap)
- [NumberInput](#numberinput)
- [PercentageInput](#percentageinput)
- [PinInput](#pininput)
- [Popover](#popover)
- [Progress](#progress)
- [RadioGroup](#radiogroup)
- [RatingGroup](#ratinggroup)
- [Reorder](#reorder)
- [RmDialog](#rmdialog)
- [RoundedButton](#roundedbutton)
- [ScrollArea](#scrollarea)
- [SearchField](#searchfield)
- [Select](#select)
- [Sidebar](#sidebar)
- [Slider](#slider)
- [Spinner](#spinner)
- [Step](#step)
- [StepIndicator](#stepindicator)
- [Stepper](#stepper)
- [Switch](#switch)
- [Table](#table)
- [Tabs](#tabs)
- [TagsInput](#tagsinput)
- [TextInput](#textinput)
- [Textarea](#textarea)
- [TimeField](#timefield)
- [Toast](#toast)
- [Toggle](#toggle)
- [ToggleGroup](#togglegroup)
- [Tooltip](#tooltip)
- [Transitions](#transitions)

---

## Accordion

**Import:** `@/components/ui/accordion`

Collapsible content sections built on Radix Accordion.

**Exports:** `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`, `DisclosureContent`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `innerClassName` | `AccordionContent` | `string` | Class for the inner content wrapper |

- `AccordionContent` includes border-top, padding, and slide animation.
- `DisclosureContent` is a simpler variant without border or padding, only slide animation.

---

## Alert

**Import:** `@/components/ui/alert`

Dismissible alert banner with icon, title, and description.

**Exports:** `Alert`, `AlertContent`, `AlertIcon`, `AlertTitle`, `AlertDescription`, `CloseButton`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `variant` | `Alert` | `"default" \| "primary" \| "error" \| "warning" \| "success"` | `"default"` | Color scheme |
| `open` | `Alert` | `boolean` | - | Controlled open state |
| `onOpenChange` | `Alert` | `(open: boolean) => void` | - | Controlled callback |

---

## ApplePayCard / GooglePayCard

**Import:** `@/components/ui/apple-pay-card`

Pre-built payment method display cards.

**Exports:** `ApplePayCard`, `GooglePayCard`

| Prop | Type | Notes |
|------|------|-------|
| `onRemove` | `() => void` | Remove button handler |
| `amountToBePaid` | `string` | Displayed amount |

---

## Autocomplete

**Import:** `@/components/ui/autcomplete`

Searchable dropdown built on Headless UI Combobox.

**Exports:** `AutocompleteRoot`, `Autocomplete`, `AutocompleteLabel`, `AutocompleteTrigger`, `AutocompleteInput`, `AutocompleteButton`, `AutocompleteOptions`, `AutocompleteOption`

**Also exports:** `LocationAutocomplete` (from `location-autocomplete.tsx`) -- pre-built Google Places location search.

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `invalid` | `AutocompleteInput` | `boolean` | Error state styling |

- Default width: `w-[320px]` on `AutocompleteRoot`.

---

## Avatar

**Import:** `@/components/ui/avatar`

User avatar with image, fallback initials, and online indicator. Radix-based.

**Exports:** `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarFallbackIcon`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `size` | `Avatar` | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl"` | - | Avatar size |
| `isOnline` | `Avatar` | `boolean` | - | Shows green online badge |

---

## AvatarGroup

**Import:** `@/components/ui/avatar-group`

Stacked avatar group with overflow count.

**Exports:** `AvatarRoot`, `AvatarGroup`, `AvatarGroupButton`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `size` | `AvatarGroup` | `"xs" \| "sm" \| "md"` | - | Size of avatars |
| `max` | `AvatarGroup` | `number` | - | Max visible avatars |
| `excess` | `AvatarGroup` | `number` | - | Override excess count |
| `excessClassName` | `AvatarGroup` | `string` | - | Class for +N badge |

---

## Badge

**Import:** `@/components/ui/badge`

Inline status/tag badge with CVA variants.

**Exports:** `Badge`, `badgeVariants`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `visual` | `"gray" \| "purple" \| "error" \| "warning" \| "success" \| "sky" \| "primary" \| "indigo" \| "pink" \| "rose" \| "orange"` | `"gray"` | Color scheme |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Badge size |
| `variant` | `"rounded" \| "circular"` | `"rounded"` | Border radius style |
| `asChild` | `boolean` | - | Radix Slot pattern |

---

## BadgeGroup

**Import:** `@/components/ui/badge-group`

Groups badges with overflow count.

**Exports:** `BadgeGroup`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `max` | `number` | `3` | Max visible badges |
| `excessClassName` | `string` | - | Class for +N text |

---

## Breadcrumb

**Import:** `@/components/ui/breadcrumb`

Navigation breadcrumb trail.

**Exports:** `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbSeparator`, `BreadcrumbLink`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `separator` | `Breadcrumb` | `ReactNode` | `"/"` | Separator character |
| `spacing` | `Breadcrumb` | `string` | - | Gap between items |
| `isCurrentPage` | `BreadcrumbItem` | `boolean` | - | Marks active page |

---

## Button

**Import:** `@/components/ui/button`

Primary action button with CVA variants.

**Exports:** `Button`, `buttonVariants`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `visual` | `"primary" \| "error" \| "gray"` | `"primary"` | Color scheme |
| `variant` | `"filled" \| "light" \| "outlined" \| "ghost" \| "link"` | `"filled"` | Button style |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "2xl"` | `"sm"` | Button size |
| `asChild` | `boolean` | - | Radix Slot pattern |
| `leftIcon` | `ReactNode` | - | Icon before text |
| `rightIcon` | `ReactNode` | - | Icon after text |
| `loading` | `boolean` | - | Shows loading spinner |
| `loadingIcon` | `ReactNode` | - | Custom loading icon |

---

## ButtonGroup

**Import:** `@/components/ui/button-group`

Groups buttons in a row or column.

**Exports:** `ButtonGroup`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `direction` | `"vertical" \| "horizontal"` | - | Layout direction |
| `asChild` | `boolean` | - | Radix Slot pattern |

- Uses `grid gap-3` layout.

---

## Calendar

**Import:** `@/components/ui/calendar`

Date selection calendars built on react-aria-components.

**Exports:** `Calendar`, `RangeCalendar`, `DualCalendar`, `DoubleCalendar`, `DateRangeCalendar`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `value` | `Calendar` | `Date` | Selected date |
| `onValueChange` | `Calendar` | `(date: Date) => void` | Selection handler |
| `value` | `RangeCalendar` | `RangeValue` | `{ start: Date, end: Date }` |
| `onValueChange` | `RangeCalendar` | `(range: RangeValue) => void` | Range selection handler |

- `Calendar` includes a date text input and preset date selector.
- `DualCalendar` / `DoubleCalendar` show two months side-by-side.

---

## Card

**Import:** `@/components/ui/card`

Container cards for content display.

**Exports (card.tsx):** `Card` -- simple bordered container with hover ring effect.

**Exports (action-card.tsx):** `ActionCardRoot`, `ActionCardIcon`, `ActionCardContent`, `ActionCardTitle`, `ActionCardDescription`

**Exports (article.tsx):** `Article`, `ArticleIcon`, `ArticleTitle`, `ArticleDescription`, `ArticleContent`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `variant` | `Article` | `"default" \| "outlined" \| "destructive"` | Visual style |
| `isDragging` | `Article` | `boolean` | Drag state |
| `isError` | `Article` | `boolean` | Error state |
| `isSelected` | `Article` | `boolean` | Selected state |
| `isGrabbed` | `Article` | `boolean` | Grab state |
| `isOnCanvas` | `Article` | `boolean` | Canvas state |
| `destructive` | `Article` | `boolean` | Destructive state |

**Exports (version-card.tsx):** `VersionCardRoot`, `VersionCardHeader`, `VersionCardFooter`, `VersionCardTitle`, `VersionCardDescription`

---

## Carousel

**Import:** `@/components/ui/carousel`

Scrollable content carousel built on embla-carousel-react.

**Exports:** `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `CarouselNextTrigger`, `CarouselPreviousTrigger`, `useCarousel`, `CarouselApi`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `orientation` | `Carousel` | `"horizontal" \| "vertical"` | `"horizontal"` | Scroll direction |
| `opts` | `Carousel` | `EmblaOptionsType` | - | Embla options |
| `plugins` | `Carousel` | `EmblaPluginType[]` | - | Embla plugins |
| `setApi` | `Carousel` | `(api: EmblaCarouselType) => void` | - | API ref callback |

---

## Checkbox

**Import:** `@/components/ui/checkbox`

Checkbox input built on Radix Checkbox.

**Exports (checkbox.tsx):** `Checkbox`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"sm" \| "md" \| "lg"` | - | Checkbox size |
| `variant` | `"rounded" \| "circular"` | - | Border radius style |
| `checked` | `boolean \| "indeterminate"` | - | Supports indeterminate |

**Exports (checkbox-selector.tsx):** `CheckboxSelector`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"sm" \| "md" \| "lg"` | - | Selector size |
| `left` | `(props) => ReactNode` | - | Left content render prop |

- Card-style checkbox with content area.

---

## CheckboxGroup

**Import:** `@/components/ui/checkbox-group`

Simple wrapper for grouping checkboxes.

**Exports:** `CheckboxGroup`

- Default layout: `space-y-2.5`.

---

## Clipboard

**Import:** `@/components/ui/clipboard`

Copy-to-clipboard with visual feedback. Ark UI based.

**Exports:** `ClipboardRoot`, `ClipboardLabel`, `ClipboardControl`, `ClipboardInput`, `ClipboardTrigger`, `ClipboardIndicator`

---

## Combobox

**Import:** `@/components/ui/combobox`

Searchable select dropdown built on Headless UI Combobox.

**Exports:** `Combobox`, `ComboboxTrigger`, `ComboboxInput`, `ComboboxLabel`, `ComboboxButton`, `ComboboxOptions`, `ComboboxOption`, `ComboboxPrimitive`, `comboboxInputVariants`, `comboboxButtonVariants`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `visual` | `ComboboxInput` | `"default" \| "error" \| "gray"` | `"default"` | Color scheme |
| `size` | `ComboboxInput` | `"sm" \| "lg"` | - | Input size |
| `invalid` | `ComboboxInput` | `boolean` | - | Error state |

- Default width: `w-[224px]` on `Combobox`.

---

## Command

**Import:** `@/components/ui/command`

Command palette / search list built on cmdk.

**Exports:** `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`

- Default width: `w-[346px]`.

---

## CommandPalette

**Import:** `@/components/ui/command-palette`

Full command palette with dialog, built on cmdk + Radix Dialog.

**Exports:** `CommandPalette`, `CommandPaletteTitle`, `CommandPaletteDialog`, `CommandPaletteHeader`, `CommandPaletteDialogClose`, `CommandPaletteDialogTrigger`, `CommandPaletteInput`, `CommandPaletteList`, `CommandPaletteEmpty`, `CommandPaletteGroup`, `CommandPaletteItem`, `CommandPaletteShortcut`, `CommandPaletteSeparator`, `CommandPaletteDialogContent`

- Max width: `728px`. Grid layout for items.

---

## CreditDebitCardArticle

**Import:** `@/components/ui/credit-debit-card-article`

Credit/debit card input forms with auto card-type detection.

**Exports:** `CreditDebitCardArticle`, `CreditDebitCardArticle2`, `CreditDebitCardArticle3`, `CreditCardCvvOrCvc`

- Default export: `CreditDebitCardArticle1`
- Auto-detects: Visa, Amex, Discover, Mastercard.
- Integrates with react-hook-form.

---

## DatePicker

**Import:** `@/components/ui/date-picker`

Date selection popover combining Button + Calendar.

**Exports:** `DatePicker`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `value` | `Date` | - | Selected date |
| `onValueChange` | `(value: Date) => void` | - | Selection handler |
| `placeholder` | `string` | `"Select a date"` | Placeholder text |
| `inputClassName` | `string` | - | Trigger button class |
| `indicator` | `ReactNode` | Calendar icon | Left icon |

---

## Dialog

**Import:** `@/components/ui/dialog`

Modal dialog built on Radix Dialog.

**Exports:** `Dialog`, `DialogTrigger`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `contentVariant` | `DialogContent` | `"default" \| "unanimated"` | `"default"` | Animation mode |

- Default max-width: `480px`.
- Auto-injects `sr-only` title if none provided (accessibility).

---

## Dropdown

**Import:** `@/components/ui/dropdown`

Popover-based dropdown with search and multi-select. Combines Popover + cmdk.

**Exports:** `DropdownPopover`, `DropdownPopoverTrigger`, `DropdownPopoverContent`, `DropdownCommand`, `DropdownCommandInput`, `DropdownCommandEmpty`, `DropdownCommandGroup`, `DropdownCommandItem`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `multiple` | `DropdownPopover` | `boolean` | Enable multi-select |
| `selected` | `DropdownPopover` | `string[]` | Selected values |
| `onSelectedChange` | `DropdownPopover` | `(selected: string[]) => void` | Selection handler |
| `itemValue` | `DropdownCommandItem` | `string` | Item identifier |

---

## DropdownMenu

**Import:** `@/components/ui/dropdown-menu`

Context/action menu built on Radix DropdownMenu.

**Exports:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuCheckItem`, `DropdownMenuRadioItem`, `DropdownMenuRadioTrigger`, `DropdownMenuRadioCheckItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `visual` | `DropdownMenuItem` | `"default" \| "destructive"` | `"default"` | Item color |

---

## Dropzone

**Import:** `@/components/ui/dropzone`

File upload dropzone built on react-dropzone.

**Exports:** `Dropzone`, `SquareShapeDropzone`, `CircularProgressDropzone`, `DropzoneState`, `CircularProgressDropzoneState`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `maxFiles` | `Dropzone` | `number` | - | Max file count |
| `maxSize` | `Dropzone` | `number` | - | Max file size in bytes |
| `value` | `Dropzone` | `File[]` | - | Controlled file list |
| `onValueChange` | `Dropzone` | `(files: File[]) => void` | - | File change handler |
| `onRetry` | `Dropzone` | `() => void` | - | Retry upload handler |
| `acceptedExtensions` | `Dropzone` | `string[]` | - | Allowed file types |
| `size` | `Dropzone` | `"sm" \| "lg"` | - | Dropzone size |
| `icon` | `Dropzone` | `ReactNode` | - | Custom upload icon |

- Includes upload progress, error states, and image preview.

---

## Editable

**Import:** `@/components/ui/editable`

Inline text editing built on Ark UI Editable.

**Exports:** `EditableRootProvider`, `EditableRoot`, `EditableLabel`, `EditableArea`, `EditableInput`, `EditablePreview`, `EditableControl`, `EditableCancelTrigger`, `EditableSubmitTrigger`, `EditableEditTrigger`

---

## ErrorMessage

**Import:** `@/components/ui/error-message`

Form field error text.

**Exports:** `ErrorMessage`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"xs" \| "sm" \| "md" \| "lg"` | - | Text size |

- Default: `text-error-500`, `role="alert"`.

---

## Favorite

**Import:** `@/components/ui/favorite`

Star toggle button for favoriting items.

**Exports:** `Favorite`, `FavoriteRoot`

| Prop | Type | Notes |
|------|------|-------|
| `value` | `boolean` | Controlled state |
| `onValueChange` | `(value: boolean) => void` | Toggle handler |
| `defaultValue` | `boolean` | Initial state |
| `starClassName` | `string` | Star icon class |

---

## HelperText

**Import:** `@/components/ui/helper-text`

Form field helper/hint text.

**Exports:** `HelperText`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"xs" \| "sm" \| "md" \| "lg"` | - | Text size |

- Default: `text-gray-500`.

---

## HoverCard

**Import:** `@/components/ui/hover-card`

Content card that appears on hover. Radix-based.

**Exports:** `HoverCard`, `HoverCardTrigger`, `HoverCardContent`

- Default `openDelay`: 300ms.
- Default width: `w-[346px]`.

---

## IconButton

**Import:** `@/components/ui/icon-button`

Square icon-only button with CVA variants.

**Exports:** `IconButton`, `iconButtonVariants`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `visual` | `"primary" \| "error" \| "gray"` | `"primary"` | Color scheme |
| `variant` | `"filled" \| "light" \| "outlined" \| "ghost"` | `"filled"` | Button style |
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "2xl"` | `"sm"` | Button size |
| `asChild` | `boolean` | - | Radix Slot pattern |

---

## ImageEditor

**Import:** `@/components/ui/image-editor`

Dialog-based image crop/rotate/zoom editor using framer-motion.

**Exports:** `PictureEditor`, `ImageEditor`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `variant` | `PictureEditor` | `"avatar" \| "image"` | Crop shape |
| `onValueChange` | `PictureEditor` | `(dataUrl: string) => void` | Cropped image output |
| `onSaveImage` | `PictureEditor` | `(file: File) => void` | Save handler |
| `startingPoint` | `PictureEditor` | `ReactNode` | Initial trigger content |
| `defaultDataUrl` | `PictureEditor` | `string` | Pre-loaded image |
| `editDialogTitle` | `PictureEditor` | `string` | Dialog title |
| `fallbackInitials` | `PictureEditor` | `string` | Avatar fallback text |

---

## Input

**Import:** `@/components/ui/input`

Text input field with CVA variants.

**Exports (input.tsx):** `Input`, `inputVariants`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `"error"` | - | Error state styling |
| `isInvalid` | `boolean` | - | Alternative error prop |

- Default: `h-11`, `rounded-[5px]`, `shadow-xs`.

**Exports (input-addon.tsx):** `InputLeftAddon`, `InputRightAddon`

**Exports (input-element.tsx):** `InputLeftElement`, `InputRightElement`

- Elements are absolutely positioned inside an InputGroup.

---

## InputGroup

**Import:** `@/components/ui/input-group`

Container that coordinates Input with addons and elements.

**Exports:** `InputGroup`, `InputGroupProvider`, `useInputGroupContext`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `fieldHeight` | `string` | `"2.75rem"` | Input height |

- Automatically adjusts Input padding and border-radius based on child InputLeftElement/InputRightElement/InputLeftAddon/InputRightAddon presence.

---

## Label

**Import:** `@/components/ui/label`

Form field label built on Radix Label.

**Exports:** `Label`, `labelVariants`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"xs" \| "sm" \| "md" \| "lg"` | - | Text size |

- Default: `text-gray-800`, `font-medium`.

---

## Listbox

**Import:** `@/components/ui/listbox`

Select dropdown built on Headless UI Listbox.

**Exports:** `Listbox`, `ListboxLabel`, `ListboxContent`, `ListboxButton`, `ListboxOptions`, `ListboxOption`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `multiple` | `Listbox` | `boolean` | Multi-select mode |
| `placeholder` | `ListboxButton` | `string` | Placeholder text |
| `isInvalid` | `ListboxButton` | `boolean` | Error state |
| `displayValue` | `ListboxButton` | `ReactNode` | Custom display |
| `indicator` | `ListboxButton` | `boolean` | Show chevron |

- Includes ScrollArea integration for long option lists.

---

## Map (GoogleMap)

**Import:** `@/components/ui/map`

Google Maps embed iframe.

**Exports:** `GoogleMap`

| Prop | Type | Notes |
|------|------|-------|
| `location` | `string` | Location search query |
| `latitude` | `number` | Lat coordinate |
| `longitude` | `number` | Lng coordinate |
| `title` | `string` | Iframe title |
| `className` | `string` | Container class |

---

## NumberInput

**Import:** `@/components/ui/number-input`

Numeric input with increment/decrement buttons. zag-js based.

**Exports:** `NumberInput`

| Prop | Type | Notes |
|------|------|-------|
| `value` | `number` | Controlled value |
| `onValueChange` | `(value: number) => void` | Change handler |
| `min` | `number` | Minimum value |
| `max` | `number` | Maximum value |
| `placeholder` | `string` | Placeholder text |
| `header` | `(labelProps) => ReactNode` | Label render prop |
| `groupClassName` | `string` | InputGroup class |
| `className` | `string` | Input class |

---

## PercentageInput

**Import:** `@/components/ui/percentage-input`

Percentage input with increment/decrement. zag-js based.

**Exports:** `PercentageInput`

- Same API as NumberInput.
- Default `min=0`, `max=100`.
- Increment/decrement buttons visible on hover.

---

## PinInput

**Import:** `@/components/ui/pin-input`

PIN code input fields. zag-js based.

**Exports:** `FourDigitPinInput`, `SixDigitPinInput`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"sm" \| "md" \| "lg"` | - | Input size |
| `onValueComplete` | `(details) => void` | - | Called when all digits filled |

- `SixDigitPinInput` includes a dash separator between digits 3 and 4.

---

## Popover

**Import:** `@/components/ui/popover`

Floating content panel built on Radix Popover.

**Exports:** `Popover`, `PopoverTrigger`, `PopoverContent`

- Default width: `w-[346px]`.
- Default `sideOffset`: 8px.

---

## Progress

**Import:** `@/components/ui/progress`

Progress indicators.

**Exports:** `Progress`, `CircularProgress`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `value` | `Progress` | `number` | Percentage (0-100) |
| `size` | `CircularProgress` | `number` | Circle diameter |
| `strokeWidth` | `CircularProgress` | `number` | Stroke width |
| `value` | `CircularProgress` | `number` | Percentage |
| `show` | `CircularProgress` | `boolean` | Show/hide |

- `Progress` includes a tooltip bubble showing the current percentage.

---

## RadioGroup

**Import:** `@/components/ui/radio-group`

Radio button group built on Radix RadioGroup.

**Exports (radio-group.tsx):** `RadioGroup`, `RadioGroupItem`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `size` | `RadioGroupItem` | `"sm" \| "md" \| "lg"` | Radio size |

**Exports (radio-group-item-selector.tsx):** `RadioGroupItemSelector`

| Prop | Type | Notes |
|------|------|-------|
| `size` | `"sm" \| "md" \| "lg"` | Selector size |

- Card-style radio with content area.

---

## RatingGroup

**Import:** `@/components/ui/rating-group`

Star rating input built on Ark UI RatingGroup.

**Exports:** `RatingGroupRoot`, `RatingGroupLabel`, `RatingGroupControl`, `RatingGroupContext`, `RatingGroupItem`

---

## Reorder

**Import:** `@/components/ui/reorder`

Drag-to-reorder list built on framer-motion Reorder.

**Exports:** `ReorderGroup`, `ReorderItem`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `children` | `ReorderItem` | `(dragControls: DragControls) => ReactNode` | Render prop with drag handle controls |

---

## RmDialog

**Import:** `@/components/ui/rm-dialog`

Confirmation dialog for remove/delete actions.

**Exports:** `RmDialog` (default)

| Prop | Type | Notes |
|------|------|-------|
| `trigger` | `ReactNode` | Trigger element |
| `open` | `boolean` | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | Open state handler |
| `title` | `string` | Dialog title |
| `description` | `string` | Confirmation message |
| `onRemove` | `() => void` | Remove action handler |

---

## RoundedButton

**Import:** `@/components/ui/rounded-button`

Circular button.

**Exports:** `RoundedButton`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `variant` | `"primary" \| "secondary"` | - | Color scheme |
| `size` | `"sm" \| "md"` | - | Button size |

---

## ScrollArea

**Import:** `@/components/ui/scroll-area` (directory is `scroll-aria`)

Custom scrollbar container built on Radix ScrollArea.

**Exports:** `ScrollArea`, `ScrollBar`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `scrollBar` | `ScrollArea` | `ReactNode` | Custom ScrollBar element |
| `viewportClassName` | `ScrollArea` | `string` | Viewport wrapper class |
| `viewportStyle` | `ScrollArea` | `CSSProperties` | Viewport inline styles |
| `thumbClassName` | `ScrollBar` | `string` | Scrollbar thumb class |

---

## SearchField

**Import:** `@/components/ui/search-field`

Search input with icon and button.

**Exports:** `SearchField`, `SearchFieldInput`, `SearchFieldButton`

- Reuses `comboboxInputVariants` and `comboboxButtonVariants`.
- Default width: `w-[224px]`.

---

## Select

**Import:** `@/components/ui/select`

Select dropdown built on Radix Select.

**Exports:** `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `HeadlessSelectTrigger`, `HeadlessSelectIcon`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `invalid` | `SelectTrigger` | `boolean` | - | Error state |
| `indicator` | `SelectTrigger` | `boolean` | `true` | Show chevron icon |

---

## Sidebar

**Import:** `@/components/ui/sidebar`

Navigation sidebar.

**Exports:** `Sidebar`, `SidebarHeader`, `SidebarContent` (and more)

- Default width: `w-[70px]`.
- Rendered as `<nav>` element.

---

## Slider

**Import:** `@/components/ui/slider`

Range slider built on Radix Slider.

**Exports:** `SliderRoot`, `SliderTrack`, `SliderThumb`, `SliderRange`, `Slider`

- `Slider` is the pre-composed convenience component.
- `SliderRoot`, `SliderTrack`, `SliderThumb`, `SliderRange` are individual building blocks.

---

## Spinner

**Import:** `@/components/ui/spinner`

Loading spinner indicator.

**Exports:** `Spinner`, `FullPageSpinner`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `size` | `Spinner` | `number` | SVG diameter |
| `strokeWidth` | `Spinner` | `number` | Stroke width |
| `value` | `Spinner` | `number` | Determinate progress |
| `trackClassName` | `Spinner` | `string` | Background track class |

- `FullPageSpinner` centers the spinner in full viewport.

---

## Step

**Import:** `@/components/ui/step`

Checkout/wizard step indicator.

**Exports:** `CheckoutStep` (default)

| Prop | Type | Notes |
|------|------|-------|
| `disabled` | `boolean` | Disabled state |
| `label` | `string` | Step label text |
| `index` | `number` | Step number |

---

## StepIndicator

**Import:** `@/components/ui/step-indicator`

Circular numbered step indicator.

**Exports:** `StepIndicator` (default)

| Prop | Type | Notes |
|------|------|-------|
| `disabled` | `boolean` | Disabled state |
| `index` | `number` | Step number |
| `state` | `"active" \| "disabled"` | Visual state |
| `children` | `ReactNode` | Custom content |

---

## Stepper

**Import:** `@/components/ui/stepper`

Multi-step wizard controller.

**Exports:** `StepperProvider`, `useStepperContext`, `StepRootProvider`, `useStepRootContext`, `StepControl` (and more)

- Provides context for managing step navigation state.

---

## Switch

**Import:** `@/components/ui/switch`

Toggle switch built on Radix Switch.

**Exports:** `Switch`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `"sm" \| "md" \| "lg"` | - | Switch size |
| `visual` | `"blue" \| "gray"` | - | Color scheme |

---

## Table

**Import:** `@/components/ui/table`

Standard HTML table with design system styling.

**Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`

---

## Tabs

**Import:** `@/components/ui/tabs`

Tab navigation built on Radix Tabs with framer-motion animations.

**Exports:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (and more)

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `unanimated` | `TabsTrigger` | `boolean` | Disable animation |
| `layoutId` | `TabsTrigger` | `string` | framer-motion layout group |

---

## TagsInput

**Import:** `@/components/ui/tags-input`

Tag/chip input with autocomplete suggestions. Ark UI based.

**Exports:** `TagsInputRoot`, `TagsInputLabel`, `TagsInputControl`, `TagsInputItem`, `TagsInputItemPreview`, `TagsInputItemText`, `TagsInputItemDeleteTrigger`, `TagsInputItemInput`, `TagsInputInput`, `TagsInputClearTrigger`, `TagsInputContext`

| Prop | Component | Type | Notes |
|------|-----------|------|-------|
| `invalid` | `TagsInputControl` | `boolean` | Error state |
| `options` | `TagsInputInput` | `string[]` | Autocomplete suggestions |
| `onInputValueChange` | `TagsInputInput` | `(value: string) => void` | Search handler |
| `allowCreateOption` | `TagsInputInput` | `boolean` | Allow custom tags |
| `portalDropdown` | `TagsInputInput` | `boolean` | Portal dropdown to body |

- Integrates Command (cmdk) for suggestion filtering.
- `TagsInputItemPreview` accepts Badge variant props (`size`, `visual`, `variant`).

---

## TextInput

**Import:** `@/components/ui/text-input`

Enhanced text input with built-in validation and character count.

**Exports:** `TextInput`

| Prop | Type | Notes |
|------|------|-------|
| `onValueChange` | `(value: string) => void` | Simplified change handler |
| `validate` | `(value: string) => boolean` | Input validation function |
| `maxLength` | `number` | Character limit |

- Uses `inputVariants` from Input.

---

## Textarea

**Import:** `@/components/ui/textarea`

Multi-line text input.

**Exports:** `Textarea`

| Prop | Type | Notes |
|------|------|-------|
| `isInvalid` | `boolean` | Error state |

- Default: `h-[128px]`, `resize-none`, `rounded-[5px]`.

---

## TimeField

**Import:** `@/components/ui/time-field`

Time input built on react-aria-components.

**Exports:** `TimeField`, `TimeFieldLabel`, `TimeFieldInput`, `TimeFieldSegment`

---

## Toast

**Import:** `@/components/ui/toast`

Notification toasts built on Radix Toast.

**Exports (toast.tsx):** `Toast`, `ToastProvider`, `ToastViewport`, `ToastAction`, `ToastClose`, `ToastTitle`, `ToastDescription`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `variant` | `Toast` | `"default" \| "destructive" \| "success"` | `"default"` | Toast style |

**Exports (toaster.tsx):** `Toaster`

**Exports (use-toast.tsx):** `useToast`, `toast`

---

## Toggle

**Import:** `@/components/ui/toggle`

Toggle button. Direct re-export of Radix Toggle primitive.

**Exports:** `Toggle`

---

## ToggleGroup

**Import:** `@/components/ui/toggle-group`

Segmented control / toggle button group. Ark UI based.

**Exports:** `ToggleGroupRoot`, `ToggleGroupItem`, `ToggleGroup`

- Container style: `bg-gray-100` with rounded corners.
- `ToggleGroup` is the pre-composed convenience component.

---

## Tooltip

**Import:** `@/components/ui/tooltip`

Hover tooltip built on Radix Tooltip.

**Exports:** `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `TooltipArrow`

| Prop | Component | Type | Default | Notes |
|------|-----------|------|---------|-------|
| `size` | `TooltipContent` | `"sm" \| "md"` | `"sm"` | Tooltip size |
| `visual` | `TooltipContent` | `"white" \| "gray"` | `"gray"` | Color scheme |

---

## Transitions

**Import:** `@/components/ui/transitions`

Animation wrappers built on Headless UI Transition.

**Exports:** `TileTransition`, `ScaleOutIn`

- `TileTransition`: horizontal slide in/out animation.
- `ScaleOutIn`: scale + fade in/out animation. Props: `show` (boolean).
