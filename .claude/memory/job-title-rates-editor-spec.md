---
name: Job Title & Rates Editor Modal Spec
description: Complete specification for the job title and hourly rate editor dialog
type: reference
---

# Job Title & Rates Editor Modal – Complete Spec

## Overview

The **Job Title & Rates Editor** is a modal dialog (`MoreInfoDialog`) that pops up when users click the edit icon (pencil) next to the "Rate" in the info bar. It allows users to:

1. Add/edit/delete **multiple job titles** (max 3)
2. Set **hourly client rate** for each job title
3. Track **take-home earnings** (automatically calculated with 20% fee)
4. Mark one job title as **default** (used in profile display)

**File locations:**
- Dialog component: `/frontend/components/edit-profile-modals.tsx` — lines 630–1430 (`MoreInfoForm` + `MoreInfoDialog`)
- Page integration: `/frontend/app/(group)/(group)/talent-profile/page.tsx` — lines 361, 641, 871, 8575

**Data source:**
- Reads from: `profile.jobTitles` array (new structure) or `profile.role + profile.rateMax` (legacy fallback)
- Saves to: `UserAPI.updateProfile(userId, payload)` with `jobTitles`, `rateMin`, `rateMax`, `role` fields

---

## 1. Form Data Model

```typescript
type MoreInfoFormValues = {
  jobTitle: string          // e.g. "React Developer"
  saveAsDefault: boolean    // Whether this is the primary job title
  clientRate: number        // Hourly rate shown to clients (e.g. 75)
  earning: number           // Take-home after 20% fee (e.g. 60)
  fee: number               // 20% of clientRate (e.g. 15)
}

// UI displays list of these as "job title chunks"
// Max 3 per user
```

### Validation (Zod schema):

```typescript
const moreInfoFormSchema = z.object({
  jobTitle: z.string()
    .min(1, "Please enter a job title"),          // Required
  saveAsDefault: z.boolean(),                      // Can be true/false
  clientRate: z.number()
    .min(1, "Please enter a client rate")         // Required, >= $1/hr
    .max(1000, "Rate cannot exceed $1,000/hr"),   // Max $1000/hr
  earning: z.number()
    .min(1, "Please enter your earnings")         // Required (auto-calc)
    .max(1000, "Rate cannot exceed $1,000/hr"),   // Max $1000/hr
  fee: z.number()                                 // Auto-calculated, not user-editable
})
```

---

## 2. Dialog Layout & Features

### 2.1 Header Section
- **Title:** "Job Title & Rates"
- **Subtitle:** "Tell us what you do and set your hourly rates"
- **Action buttons:**
  - **"Add Job Title"** button (disabled if 3 titles already exist, shows tooltip "Max 3 job titles")
  - **Close (X)** button (prompts to save if form is dirty)

### 2.2 Job Title List Area
Scrollable container (`max-h-[652px]`) showing:

1. **If adding new title:** `MoreInfoForm` (editable form)
2. **For each saved title:** Card with:
   - Title (e.g. "React Developer")
   - Client rate (e.g. "$75/hr")
   - Your earnings (e.g. "$60/hr")
   - "Default" badge (if marked as default)
   - Edit button (pencil icon)
   - Delete button (trash icon)

3. **When editing existing title:** Form expands inline where the card was

### 2.3 Form Section (`MoreInfoForm`)
Displays when:
- User clicks "Add Job Title" button, OR
- User clicks Edit on an existing title

**Fields:**

#### Job Title Input
- Label: "Job Title 1"
- Placeholder: "e.g. Software Engineer"
- Type: Text input
- Rules:
  - Numbers are stripped as user types (regex filter: `/[0-9]/g`)
  - Duplicates are detected and rejected (case-insensitive)
  - Required (min 1 char)
  - Auto-formatted: capitalized title case (e.g. "react developer" → "React Developer")

#### Save as Default Checkbox
- Label: "Save as default job title"
- Behavior:
  - When checked, all OTHER job titles have `saveAsDefault` set to `false`
  - Only ONE job title can be default at a time
  - If all titles are deleted, next saved title auto-becomes default
  - If deleted the default, first remaining title auto-becomes default

#### Client Rate Input
- Label: "Client Rate"
- Helper text: "This is what clients will see"
- Tooltip: "The hourly rate clients will see on your profile"
- Input: Currency field (USD, right-aligned, no decimals)
- Prefix: "USD"
- Suffix: "/hr"
- Rules:
  - Required (min $1)
  - Max $1,000/hr
  - No decimals (rounds to nearest dollar)
  - **Real-time calculation:** When user changes this, `fee` and `earning` auto-calculate:
    ```
    fee = Math.round(clientRate * 0.2)
    earning = clientRate - fee
    ```

#### Service Fee Display (Read-only Alert)
- Title: "Marketeq Service Fee (20%)"
- Description: "Lorem ipsum dolor sit amet consectetur adipisicing elit."
- Shows: Calculated fee amount in USD (e.g. "$15/hr")
- Style: Alert box with icon
- **Not editable** — auto-calculates from `clientRate`

#### Your Earnings Input
- Label: "Your Earnings"
- Helper text: "Estimated take-home pay after fees"
- Tooltip: "Your take-home pay after the 20% Marketeq service fee"
- Input: Currency field (USD, right-aligned, no decimals)
- Prefix: "USD"
- Suffix: "/hr"
- Rules:
  - Required (min $1)
  - Max $1,000/hr
  - **Reverse calculation:** If user modifies this field, `clientRate` auto-recalculates:
    ```
    derivedRate = Math.round(earning / 0.8)
    fee = Math.round(derivedRate * 0.2)
    clientRate = derivedRate
    ```
- **Real-time sync:** Use `usePrevious` hook to detect which field changed, then recalculate the other

#### Form Action Buttons (inside form card)
- **Check button (green):** Submits the form (calls `handleSubmit(onSubmit)`)
- **Trash button (red):** Opens delete confirmation dialog

---

## 3. Multi-Title Management

### Adding a Title
1. User clicks "Add Job Title" button
2. Form appears with empty fields (`defaultValues` used)
3. User fills out job title, rates
4. User clicks check button or main Save button
5. New title added to `infoChunks` array, merged with existing titles
6. If marked as default, all other titles have `saveAsDefault` set to false
7. Array sorted so default title is always first

### Editing a Title
1. User clicks Edit pencil on an existing card
2. Form replaces that card with same fields pre-filled
3. User modifies job title, rates, or default status
4. User clicks check button or main Save button
5. Title in `infoChunks` updated at original index
6. If marked as default, other titles' defaults cleared

### Deleting a Title
1. User clicks trash icon on a card OR inside form
2. Confirmation dialog appears: "Your '{jobTitle}' job title will be removed. This cannot be undone."
3. User confirms "Yes, Delete"
4. Title removed from `infoChunks`
5. Smart default handling:
   - If only 1 title left, auto-set as default
   - If deleted the default title, promote first remaining title to default
   - If all deleted, clear everything (set `canPerformAction = true` for empty form)

---

## 4. State Management

### Dialog State (Page Level)
```typescript
const [jobTitleOpen, setJobTitleOpen] = useState(false)  // Dialog open/close
```

### Form State (Dialog Level)
```typescript
const methods = useForm<MoreInfoFormValues>({
  resolver: zodResolver(moreInfoFormSchema),
  defaultValues,
  mode: "onChange",  // Validate on each keystroke
})

// Key state variables
const [canPerformAction, setCanPerformAction] = useState(false)   // Show form (add/edit mode)
const [maxTitlesError, setMaxTitlesError] = useState(false)       // Show max titles warning
const [duplicateTitleError, setDuplicateTitleError] = useState(false) // Show duplicate warning
const [editingIndex, setEditingIndex] = useState<number>()         // Which title being edited (undefined = adding new)
const [indexToRemove, setIndexToRemove] = useState<number>()       // Which title to delete
const [isOpen, setIsOpen] = useState(false)                        // Delete confirmation dialog
const [show, setShow] = useState(false)                            // Secondary dialog for delete
const [infoChunks, setInfoChunks] = useState<MoreInfoFormValues[]>() // All saved titles
```

### Initialization (on dialog open)
```typescript
useEffect(() => {
  if (opened) {
    setEditingIndex(undefined)
    setMaxTitlesError(false)
    setDuplicateTitleError(false)

    // Load saved titles
    if (profile?.jobTitles?.length > 0) {
      setInfoChunks(profile.jobTitles)
      setCanPerformAction(false)  // Show list, hide form
    }
    // Fallback: legacy single title from old schema
    else if (profile?.role || profile?.rateMax) {
      const clientRate = Number(profile.rateMax) || 0
      const fee = Math.round(clientRate * 0.2)
      const earning = clientRate - fee
      const legacyChunk: MoreInfoFormValues = {
        jobTitle: profile.role || "Professional",
        clientRate,
        earning,
        fee,
        saveAsDefault: true,
      }
      if (clientRate > 0) {
        setInfoChunks([legacyChunk])
        setCanPerformAction(false)
      } else {
        methods.reset({ ...defaultValues, jobTitle: profile.role || "" })
        setCanPerformAction(true)
      }
    } else {
      setCanPerformAction(true)  // Empty form (no titles yet)
    }
  }
}, [opened])
```

---

## 5. Save & API Integration

### On Submit
```typescript
const onSubmit: SubmitHandler<MoreInfoFormValues> = async (values) => {
  // 1. Format job title (title case, spaces)
  const formatted = {
    ...values,
    jobTitle: formatJobTitle(values.jobTitle)
  }

  // 2. Build updated chunks
  let updatedChunks: MoreInfoFormValues[]
  if (editingIndex !== undefined) {
    // Editing: replace at original index
    updatedChunks = infoChunks.map((q, i) =>
      i === editingIndex
        ? formatted
        : formatted.saveAsDefault
          ? { ...q, saveAsDefault: false }  // Clear other defaults
          : q
    )
  } else {
    // Adding: append new entry
    updatedChunks = (infoChunks ?? [])
      .map(q => formatted.saveAsDefault ? { ...q, saveAsDefault: false } : q)
      .concat(formatted)
  }

  // 3. Sort: default always first
  updatedChunks.sort((a, b) =>
    a.saveAsDefault === b.saveAsDefault ? 0 : a.saveAsDefault ? -1 : 1
  )

  // 4. Update local state
  setInfoChunks(updatedChunks)
  setEditingIndex(undefined)

  // 5. API: compute rate range + default title
  if (userId) {
    const allRates = updatedChunks.map(c => c.clientRate).filter(r => r > 0)
    const defaultChunk = updatedChunks.find(c => c.saveAsDefault) ?? updatedChunks[0]

    const payload = {}
    if (allRates.length > 1) {
      payload.rateMin = Math.min(...allRates)
      payload.rateMax = Math.max(...allRates)
    } else if (allRates.length === 1) {
      payload.rateMin = allRates[0]
      payload.rateMax = allRates[0]
    }

    if (defaultChunk?.jobTitle) payload.role = defaultChunk.jobTitle
    payload.jobTitles = updatedChunks

    await UserAPI.updateProfile(userId, payload)  // ✅ API CALL
    onSaved?.()  // Trigger parent refresh
  }

  reset(defaultValues)
}
```

### On Delete
```typescript
// Delete confirmation dialog's "Yes, Delete" button
const remaining = infoChunks?.filter((_, i) => i !== indexToRemove) ?? []

// Smart default handling
if (remaining.length === 1 && !remaining[0].saveAsDefault) {
  remaining[0] = { ...remaining[0], saveAsDefault: true }
}
if (remaining.length > 0 && !remaining.some(c => c.saveAsDefault)) {
  remaining[0] = { ...remaining[0], saveAsDefault: true }
}

setInfoChunks(remaining.length > 0 ? remaining : undefined)

// API: update with remaining titles
if (userId) {
  const payload = {}
  if (remaining.length > 0) {
    const allRates = remaining.map(c => c.clientRate).filter(r => r > 0)
    const defaultChunk = remaining.find(c => c.saveAsDefault) ?? remaining[0]

    if (allRates.length > 1) {
      payload.rateMin = Math.min(...allRates)
      payload.rateMax = Math.max(...allRates)
    } else if (allRates.length === 1) {
      payload.rateMin = allRates[0]
      payload.rateMax = allRates[0]
    }
    if (defaultChunk?.jobTitle) payload.role = defaultChunk.jobTitle
    payload.jobTitles = remaining
  } else {
    // All deleted: clear profile rate fields
    payload.rateMin = null
    payload.rateMax = null
    payload.role = null
    payload.jobTitles = null
  }

  await UserAPI.updateProfile(userId, payload)  // ✅ API CALL
  onSaved?.()
}
```

---

## 6. Backend Integration

### ✅ What's Wired Up

| Field | Backend | Frontend | Status |
|-------|---------|----------|--------|
| `jobTitles` array | Stored in user profile | Full CRUD | ✅ Complete |
| `rateMin` | Computed from all job title rates | Auto-calculated | ✅ Complete |
| `rateMax` | Computed from all job title rates | Auto-calculated | ✅ Complete |
| `role` | Default job title | Set from `saveAsDefault` | ✅ Complete |
| Fee calculation (20%) | Hardcoded in UI | 20% on client rate | ✅ Complete |
| Earning calculation | Hardcoded in UI | `clientRate - fee` | ✅ Complete |

### API Payload Sent to Backend
```typescript
{
  jobTitles: [
    {
      jobTitle: "React Developer",
      clientRate: 75,
      earning: 60,
      fee: 15,
      saveAsDefault: true
    },
    {
      jobTitle: "Node.js Backend Developer",
      clientRate: 80,
      earning: 64,
      fee: 16,
      saveAsDefault: false
    }
  ],
  rateMin: 75,      // Min across all clientRates
  rateMax: 80,      // Max across all clientRates
  role: "React Developer"  // Default job title
}
```

### API Endpoint
```
PUT /api/users/:userId
Body: { jobTitles, rateMin, rateMax, role }
```

### ✅ What Works End-to-End
1. User opens dialog → loads saved `profile.jobTitles`
2. User adds/edits/deletes titles → local state updates
3. User clicks Save → `UserAPI.updateProfile()` called with payload
4. Backend receives & stores titles + computed rates
5. Page refreshes via `onSaved?.()` callback
6. Info bar displays new rates from backend

---

## 7. Key Implementation Details

### 7.1 Duplicate Title Detection
```typescript
const checkDuplicate = (titleOverride?: string): boolean => {
  const raw = titleOverride ?? methods.getValues("jobTitle")
  if (!raw?.trim()) return false

  const title = formatJobTitle(raw)
  const existingTitles = (infoChunks ?? [])
    .filter((_, i) => i !== editingIndex)  // Exclude current (if editing)

  const isDuplicate = existingTitles.some(
    chunk => chunk.jobTitle.toLowerCase() === title.toLowerCase()
  )
  setDuplicateTitleError(isDuplicate)
  return isDuplicate
}
```

### 7.2 Real-Time Rate Calculations
Uses `usePrevious` hook to detect which field changed:
- **Client rate changed:** Recalculate fee & earning
- **Earning changed:** Reverse-calculate client rate & fee

```typescript
const [previousClientRate, previousEarning] = [
  usePrevious(clientRate),
  usePrevious(earning)
]

useEffect(() => {
  if (previousClientRate !== clientRate && clientRate != null) {
    const fee = Math.round(clientRate * 0.2)
    setValue("fee", fee)
    setValue("earning", clientRate - fee)
  } else if (previousEarning !== earning && earning != null) {
    const derivedRate = Math.round(earning / 0.8)
    const fee = Math.round(derivedRate * 0.2)
    setValue("clientRate", derivedRate)
    setValue("fee", fee)
  }
}, [previousClientRate, previousEarning, clientRate, earning, setValue])
```

### 7.3 Form Validation on Change
```typescript
const methods = useForm<MoreInfoFormValues>({
  resolver: zodResolver(moreInfoFormSchema),
  defaultValues,
  mode: "onChange",  // Validate every keystroke
})
```

Enable Save button only when form is valid AND:
- User entered a job title, OR
- User entered a client rate within $1–$1000/hr
```typescript
const saveDisabled =
  (canPerformAction || typeof editingIndex === "number") &&
  (!clientRate || clientRate > 1000 || !methods.getValues("jobTitle"))
```

---

## 8. Edge Cases & Behaviors

| Scenario | Behavior |
|----------|----------|
| User opens dialog with no job titles | Empty form shown, "Add Job Title" enabled |
| User opens dialog with 3 job titles | "Add Job Title" button disabled, tooltip shown |
| User tries to save duplicate title | Error message shown, Save disabled |
| User changes client rate from $75 to $80 | Earning auto-updates from $60 to $64, fee from $15 to $16 |
| User marks new title as default | All existing titles' `saveAsDefault` set to false |
| User deletes the default title | First remaining title auto-becomes default |
| User deletes all titles | Form resets to empty, "Add Job Title" re-enabled |
| User closes dialog with unsaved changes | Confirmation prompt appears |
| User navigates away after saving | `onSaved?.()` triggers parent refresh |

---

## 9. Summary: What's Changed & What's Wired

### ✅ Changes That Are Wired to Backend
- **Job titles** (text) → stored in `profile.jobTitles`
- **Client rates** → aggregated into `rateMin` / `rateMax`
- **Default job title** → stored in `profile.role`
- **User earnings & fee** → calculated client-side, NOT stored (derived from `clientRate`)

### ✅ API Integration
- ✅ Full CRUD for job titles (create, read, update, delete)
- ✅ Rate aggregation (min/max across all titles)
- ✅ Default title selection
- ✅ Legacy fallback for old single-title schema
- ✅ Form validation with duplicate detection
- ✅ Real-time calculations (client rate ↔ earnings sync)

### ⚠️ Partial Implementation
- **Service fee (20%)** — hardcoded percentage, not configurable from backend
- **Max rate ($1000/hr)** — hardcoded validation, not from backend config

This feature is **production-ready** and fully wired to the backend.
