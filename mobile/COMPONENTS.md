# Mobile Design System - Component Allowlist

**This is the ONLY source of allowed UI components for the mobile app.**
**Import everything from `@/components/ui`. No bare React Native primitives in screen files.**

## ABSOLUTE RULE: No Bare Primitives

The following React Native primitives are BANNED from screen/page files:

| Banned | Use Instead |
|--------|------------|
| `Pressable` / `TouchableOpacity` | `Button` or `IconButton` |
| `TextInput` | `Input` or `Textarea` |
| `Modal` | `Dialog` or `Select` (which wraps Modal internally) |
| `ActivityIndicator` | `Spinner` |
| `Switch` (RN built-in) | `Switch` from `@/components/ui` |

**Layout primitives (`View`, `Text`, `ScrollView`, `FlatList`, `SectionList`, `Image`, `SafeAreaView`) are allowed** in screen files because they are structural, not interactive. But interactive elements always go through the design system.

**Violation = immediate redo.** Same rule as the web frontend.

---

## Available Components

All imports: `import { ComponentName } from "@/components/ui"`

### Interactive

| Component | Props | Description |
|-----------|-------|-------------|
| **Button** | `visual` (`primary`/`error`/`gray`), `variant` (`filled`/`light`/`outlined`/`ghost`/`link`), `size` (`sm`/`md`/`lg`/`xl`/`2xl`), `leftIcon`, `rightIcon`, `loading`, `disabled` | Primary action button. Mirrors web Button exactly. |
| **IconButton** | `visual`, `variant` (`filled`/`light`/`outlined`/`ghost`), `size`, `icon`, `rounded`, `loading`, `disabled` | Icon-only button. Use `IconButton.iconColor[visual][variant]` for icon color. |
| **Input** | `isInvalid`, `leftSlot`, `rightSlot`, `containerStyle`, `inputStyle` + all TextInput props | Text input with error state. 44px height, shadow-xs, 5px radius. |
| **Textarea** | `isInvalid` + all TextInput props | Multiline text input. Min 120px height. |
| **Select** | `options`, `value`, `onChange`, `placeholder`, `isInvalid`, `disabled` | Bottom sheet picker. Replaces web Radix Select. |
| **Checkbox** | `checked`, `onChange`, `label`, `disabled` | Checkbox with optional label. |
| **Switch** | `checked`, `onChange`, `disabled` | Animated toggle switch. 44x24 track, 20px thumb. |
| **Tabs** | `items` (`{value, label}[]`), `value`, `onChange` | Segmented control / top tabs. |

### Display

| Component | Props | Description |
|-----------|-------|-------------|
| **Avatar** | `size` (`xs`-`3xl`), `src`, `name`, `isOnline` | Profile image with initials fallback and online badge. 7 sizes matching web. |
| **Badge** | `visual` (11 colors), `size` (`sm`/`md`/`lg`), `shape` (`rounded`/`circular`) | Status badge. Same colors as web. |
| **Card** | `padding` (default 16) | Surface container. 8px radius, gray-200 border, shadow-xs. |
| **Label** | `size` (`sm`/`md`), `required` | Form label with optional asterisk. |
| **Divider** | `color`, `thickness`, `vertical` | Horizontal or vertical line separator. |
| **EmptyState** | `icon`, `title`, `description`, `action` | Centered empty state with optional icon and CTA. |

### Feedback

| Component | Props | Description |
|-----------|-------|-------------|
| **Dialog** | `visible`, `onClose`, `title`, `description`, `contentStyle` | Modal dialog. Use `Dialog.Footer` for action buttons. |
| **Toast** | `message`, `variant` (`success`/`error`/`warning`/`info`), `visible`, `duration`, `onDismiss` | Auto-dismissing notification banner. |
| **Skeleton** | `width`, `height`, `borderRadius` | Animated loading placeholder. |
| **Spinner** | `size` (`sm`/`md`/`lg`), `color` | Activity indicator wrapper. |

---

## Design Tokens

All tokens: `import { colors, spacing, fontSize, ... } from "@/tokens"`

| Token File | Contents |
|-----------|----------|
| `colors.ts` | Full color palette (primary, gray, error, warning, success, etc.) |
| `spacing.ts` | 4px grid scale (0-256) |
| `typography.ts` | Font sizes, line heights, weights (Inter) |
| `radii.ts` | Border radii (none/xs/sm/md/lg/xl/2xl/full) |
| `shadows.ts` | RN shadow objects (none/xs/sm/md/lg) |

---

## Rules

1. **READ THIS FILE before writing ANY mobile UI.** Every time.
2. **ONLY use components listed above.** If it's not here, ask the CTO.
3. **NEVER create custom UI components.** No new files in `components/ui/` without CTO approval.
4. **NEVER modify existing components.** `mobile/components/ui/` is READ-ONLY for screen engineers.
5. **NEVER use bare RN interactive primitives.** Pressable, TextInput, Modal, etc. in a screen file = rejection.
6. **Layout primitives are OK.** View, Text, ScrollView, FlatList, Image, SafeAreaView are structural and allowed.
7. **Token values must match web.** If you notice a mismatch, flag it. Do not "fix" it yourself.
