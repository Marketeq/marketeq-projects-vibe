**Key Integration Details**

## **1. Metadata Shape per Listing Type**

Each favorite comes with a \"metadata\" object that your UI uses to
render cards. Make sure your backend returns these fields for each type:

  **type**   **metadata fields**
  ---------- -----------------------------------------------------------------------------------------------------------------
  project    { title, description, price: string, duration: string }
  service    { title, description, price: string, recurring: boolean }
  talent     { name, role: string, company?: string, avatarUrl: string, rating: number, availability: string, rate: string }
  job        { title, company: string, location?: string, type: string, postingDate: string }
  team       { name, memberCount: number, skills: string\[\] }

Your front‑end card and list components look for exactly those keys
under each fav.metadata.

## **2. Group Management Endpoints**

You'll need to let users **create**, **rename**, and **delete** favorite
groups. We haven't fully wired those in the example hook, so here are
the missing routes:

1.  **Create a new group\**

    - **POST** /favorites/groups

    - **Body**: { name: string, type: string }

    - **Returns**: the newly created group object ({ id, name,
      createdAt, favorites: \[\] })

2.  **Rename a group\**

    - **PATCH** /favorites/groups/:groupId

    - **Body**: { name: string }

    - **Returns**: the updated group object

3.  **Delete a group\**

    - **DELETE** /favorites/groups/:groupId

    - **Returns**: HTTP 204 No Content

Be sure your front end calls these when the user clicks **"New group"**,
**Edit** (pencil icon), or **Delete** (trash icon) in the group header.

\## 3. UI State Patterns\
Based on your designs, handle these states explicitly:

- **Empty‑state**: no groups → show a centered call‑to‑action "You
  haven't created any favorites yet... \[New group\]"

- **Group with zero items**: show "No saved items" under the group
  header

- **Loading**: skeleton loaders in place of cards or rows

- **Error**: inline banner under the search bar saying "Something went
  wrong---please retry."

- **Rate‑limited**: catch HTTP 429 on create and show "You're saving too
  fast---please wait a moment."

\## 4. Search & Filter Behavior\
Your designs show a combined search on **group name** and **item
titles**. On each keystroke:

1.  Filter groups where group.name includes the search term

2.  Inside every matching group, filter favorites by metadata.title or
    other metadata fields (e.g. skill tags)

3.  Hide any group with zero matching favorites

Make sure your hook or component implements that two‑level filtering in
exactly that order.

\## 5. Grid ⇄ List Toggle Details

- **Grid**: two‑column responsive layout, each cell is a **GroupCard**
  showing up to 4 item previews.

- **List**: vertical stack; each group header sticks at the top of its
  list block; items rendered as **ItemListRow** beneath.

- Remember to preserve the currently expanded state if you support
  "Expand" per group.

\## 6. Date & Number Formatting

- Group "Created" date should be formatted as MMM YYYY (e.g. "Jan
  2024").

- Price strings should include currency symbol and thousands separators
  (e.g. "\$1,540").

Use your locale utilities (e.g. Intl.DateTimeFormat and
Intl.NumberFormat) to match the Figma designs.

### **Putting It All Together**

1.  **Enhance** the existing useFavorites hook (or their equivalent) to
    call the **groups** endpoints above.

2.  **Map** each favorite's metadata into their card and row components
    exactly as per the type.

3.  **Implement** the search‑and‑filter logic against both groups and
    items.

4.  **Wire** the grid/list toggle to two distinct layouts.

5.  **Hook** the "New group," "Rename," and "Delete" buttons to the new
    group‑management API.

6.  **Display** the proper empty, loading, error, and rate‑limit states.

7.  **Format** dates and prices with Intl so they look exactly like in
    the designs.
