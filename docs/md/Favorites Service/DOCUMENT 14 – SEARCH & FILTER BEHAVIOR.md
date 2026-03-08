# **DOCUMENT 14 -- SEARCH & FILTER BEHAVIOR**

## **PURPOSE**

Here is the implementation guide for the client‑side search/filter
functionality on the My Favorites page. Users must be able to quickly
find saved groups and items by typing keywords.

## **PREREQUISITES**

• useFavorites hook (or equivalent) returning groups: FavoriteGroup\[\]\
• Each FavoriteGroup has { id, name, createdAt, favorites:
FavoriteItem\[\] }\
• Each FavoriteItem has metadata.title (and optional
metadata.description)

## **STEP 1 -- Two‑Level Filtering Logic**

Implement the following transform wherever you derive the visible list:

const filteredGroups = groups

.map(group =\> ({

\...group,

favorites: group.favorites.filter(item =\>

item.metadata.title

.toLowerCase()

.includes(searchTerm.toLowerCase())

)

}))

.filter(group =\>

group.name

.toLowerCase()

.includes(searchTerm.toLowerCase()) \|\|

group.favorites.length \> 0

);

- \
  **First pass** removes items whose metadata.title doesn't match
  searchTerm.

- **Second pass** removes groups whose name doesn't match **and** now
  have zero items.

## **STEP 2 -- Debounce Input**

To avoid filtering on every keystroke, debounce the search input by
150 ms:

import { useState, useEffect } from \'react\';

function useDebouncedValue\<T\>(value: T, delay = 150): T {

const \[debounced, setDebounced\] = useState(value);

useEffect(() =\> {

const timer = setTimeout(() =\> setDebounced(value), delay);

return () =\> clearTimeout(timer);

}, \[value, delay\]);

return debounced;

}

In your component:

const \[searchTerm, setSearchTerm\] = useState(\'\');

const debouncedSearch = useDebouncedValue(searchTerm);

// use \`debouncedSearch\` in the filtering logic



## **STEP 3 -- "No Results" State**

After filtering, if filteredGroups.length === 0, render:

\<div className=\"no-results\"\>

No favorites match "{searchTerm}."

\<button onClick={() =\> setSearchTerm(\'\')}\>Clear search\</button\>

\</div\>



## **STEP 4 -- UX NOTES**

- **Case‑insensitive** matching on both group names and item titles

- **Instant feedback**: update the view as soon as the debounced term
  changes

- **Highlighting** (optional): you can bold the matching substring in
  titles

- **Always show** the search box even if no favorites exist, with
  placeholder "Search favorites..."
