# **DOCUMENT 14.1 -- SEARCH & FILTER BEHAVIOR ACROSS ALL FAVORITES SCREENS**

## **PURPOSE**

Describe exactly how the search box and filtering should behave on every
"My Favorites" screen---main page, projects grid/list, and talent
grid/list---so users can always find saved items.

## **OVERVIEW**

All favorites screens share a single search bar that filters in two
dimensions:

1.  **Group-level** (by group name)

2.  **Item-level** (by each favorite's metadata)

The same logic applies across:

- **Main Favorites page** (shows all group cards)

- **Projects view** (grid and list)

- **Talent view** (grid and list)

## **1. Main "My Favorites" Page**

### **1.1 Layout & Placeholder**

- **Search bar** sits at the top-left, placeholder text:\
  **"Search by skills or project type"\**

- **Grid/List toggle** to the right, followed by **"New group"** button.

### **1.2 Filter Logic**

****const filteredGroups = groups

// filter each group's items by metadata.title or other metadata fields

.map(g =\> ({

\...g,

favorites: g.favorites.filter(item =\>

item.metadata.title.toLowerCase().includes(searchTerm.toLowerCase())

)

}))

// then keep groups whose name matches OR still have items

.filter(g =\>

g.name.toLowerCase().includes(searchTerm.toLowerCase()) \|\|

g.favorites.length \> 0

);

- **Group-level match**: g.name.includes(searchTerm)

- **Item-level match**: item.metadata.title.includes(searchTerm)

- **Empty-group removal**: any group with zero items after
  item‑filtering is hidden.

### **1.3 No‑Results State**

If filteredGroups.length === 0, show a full‑width message:

> "No favorites match '{searchTerm}'. \[Clear search\]"

## **2. Projects View**

Your "Projects" favorites screens include both **Grid** and **List**
layouts.

### **2.1 Search Bar Placement**

- In **Grid**: above the grid of project cards, same placeholder.

- In **List**: above the list of project entries, same placeholder.

### **2.2 Filter Fields**

Filter against:

- **Project Title** (metadata.title)

- **Category/Subcategory** (metadata.tags or metadata.category)

- **Skills** (metadata.skills)

const filteredProjects = allProjects.filter(p =\>

\[p.metadata.title, \...p.metadata.tags, \...p.metadata.skills\]

.some(field =\>

field.toLowerCase().includes(searchTerm.toLowerCase())

)

);

- Keep the same two‑step logic if grouping by category within projects;
  otherwise, just filter the flat list.

### **2.3 No‑Results State**

In **Grid**: show a centered card:

> "No projects match '{searchTerm}'. Try another keyword."

In **List**: full‑width row:

> "No projects found. \[Clear search\]"

## **3. Talent View**

Your "Talent" favorites screens also offer Grid and List.

### **3.1 Search Bar Placement**

- Above the talent profiles grid/list.

- Placeholder text:\
  **"Search by name, role, or skill"\**

### **3.2 Filter Fields**

Filter against:

- **Talent Name** (metadata.name)

- **Role** (metadata.role)

- **Company** (metadata.company)

- **Skills** (metadata.skills)

const filteredTalent = allTalent.filter(t =\>

\[t.metadata.name, t.metadata.role, t.metadata.company,
\...t.metadata.skills\]

.some(field =\>

field?.toLowerCase().includes(searchTerm.toLowerCase())

)

);

### **3.3 No‑Results State**

In **Grid**: display a message in place of cards:

> "No talent profiles match '{searchTerm}'."

In **List**: show a placeholder row:

> "No talent found. \[Clear search\]"

## **4. Performance & UX**

- **Debounce input** by \~150 ms to prevent excessive re‑renders.

- **Highlight matches** (optional): wrap matched substring in \<strong\>
  within titles.

- **Clear search** button: an "×" icon inside the input when
  searchTerm.length \> 0 to reset immediately.

- **Keyboard navigation**: Up/Down to cycle suggestions if you've
  implemented autocomplete.

## **5. Implementation Notes**

- **Single source of truth**: Reuse your existing useFavorites (or
  equivalent) hook for the main page, and similar useProjectsFavorites /
  useTalentFavorites hooks for the other screens.

- **Consistent UX**: the same search‑and‑filter snippet above powers
  every screen's filtering logic.

- **Styling‑agnostic**: class names (e.g. .search-bar, .no-results)
  should be mapped to your CSS framework or custom styles.
