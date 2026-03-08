# **DOCUMENT 07.1 -- AUTOCOMPLETE FOR FAVORITES SEARCH**

## **PURPOSE**

Enhance the existing SearchBar on your **My Favorites** page to offer
client‑side autocomplete suggestions derived from the user's own
favorite group names and item titles. No external service
needed---everything uses the data already loaded via useFavorites.

## **ASSUMPTIONS**

• You already have the useFavorites hook returning groups:
FavoriteGroup\[\]\
• You have a SearchBar component that takes value and onChange props\
• Your front‑end is React/Next.js (styling‑framework agnostic)

## **WHAT WE'LL DO**

1.  Extract a flat list of suggestion strings (group names + item
    titles) in the hook

2.  Pass that list into SearchBar as suggestions

3.  Render a dropdown of matching suggestions as the user types

4.  Allow clicking a suggestion to set the search input

## **1. Extend useFavorites to Expose Suggestions**

**File:** src/hooks/useFavorites.ts

export function useFavorites() {

// existing state & methods...

const \[groups, setGroups\] = useState\<FavoriteGroup\[\]\>(\[\]);

// ...

// Compute suggestions whenever groups change

const suggestions = useMemo(() =\> {

const set = new Set\<string\>();

for (const g of groups) {

set.add(g.name);

for (const fav of g.favorites) {

if (fav.metadata?.title) {

set.add(fav.metadata.title);

}

}

}

return Array.from(set);

}, \[groups\]);

return {

groups,

loading,

addFavorite,

moveFavorite,

removeFavorite,

suggestions, // new

};

}



## **2. Update SearchBar to Show Autocomplete**

**File:** src/components/SearchBar.tsx

import React, { FC, ChangeEvent, useState, useRef, useEffect } from
\'react\';

interface Props {

value: string;

onChange: (value: string) =\> void;

suggestions: string\[\];

}

export const SearchBar: FC\<Props\> = ({ value, onChange, suggestions })
=\> {

const \[show, setShow\] = useState(false);

const \[filtered, setFiltered\] = useState\<string\[\]\>(\[\]);

const containerRef = useRef\<HTMLDivElement\>(null);

// Filter suggestions whenever \`value\` changes

useEffect(() =\> {

const term = value.toLowerCase();

if (term.length === 0) {

setFiltered(\[\]);

setShow(false);

return;

}

const matches = suggestions

.filter(item =\> item.toLowerCase().includes(term))

.slice(0, 10); // limit to top 10

setFiltered(matches);

setShow(matches.length \> 0);

}, \[value, suggestions\]);

// Hide on outside click

useEffect(() =\> {

function onClick(e: MouseEvent) {

if (!containerRef.current?.contains(e.target as Node)) {

setShow(false);

}

}

document.addEventListener(\'mousedown\', onClick);

return () =\> document.removeEventListener(\'mousedown\', onClick);

}, \[\]);

return (

\<div ref={containerRef} className=\"search-bar\"\>

\<span className=\"search-icon\" aria-hidden=\"true\"\>🔍\</span\>

\<input

type=\"text\"

className=\"search-input\"

placeholder=\"Search by skills or project type\"

value={value}

onChange={(e: ChangeEvent\<HTMLInputElement\>) =\>
onChange(e.target.value)}

onFocus={() =\> { if (filtered.length) setShow(true); }}

/\>

{show && (

\<ul className=\"suggestions-list\"\>

{filtered.map((s, i) =\> (

\<li

key={i}

className=\"suggestion-item\"

onClick={() =\> {

onChange(s);

setShow(false);

}}

\>

{s}

\</li\>

))}

\</ul\>

)}

\</div\>

);

};



## **3. Wire It Up in Your Page Component**

**File:** src/components/FavoritesPage.tsx

import { SearchBar } from \'./SearchBar\';

import { useFavorites } from \'../hooks/useFavorites\';

import React, { useState } from \'react\';

export const FavoritesPage: FC = () =\> {

const { groups, loading, addFavorite, moveFavorite, removeFavorite,
suggestions } = useFavorites();

const \[search, setSearch\] = useState(\'\');

// existing filtering logic...

// use \`search\` as before

return (

\<div className=\"favorites-page\"\>

\<SearchBar

value={search}

onChange={setSearch}

suggestions={suggestions}

/\>

{/\* rest of the UI... \*/}

\</div\>

);

};



## **4. Styles (Framework‑Agnostic Classes)**

Define minimal CSS for the dropdown in your global stylesheet:

.search-bar {

position: relative;

display: inline-block;

}

.suggestions-list {

position: absolute;

top: 100%;

left: 0;

right: 0;

max-height: 200px;

overflow-y: auto;

border: 1px solid #ccc;

background: #fff;

z-index: 10;

margin: 0;

padding: 0;

list-style: none;

}

.suggestion-item {

padding: 0.5em;

cursor: pointer;

}

.suggestion-item:hover {

background: #f0f0f0;

}



## **5. Verification**

1.  **Start** your Next.js app.

2.  **Navigate** to /favorites.

3.  **Type** into the search field; you should see a dropdown of
    suggestions drawn from group names and item titles.

4.  **Click** a suggestion: the input value updates and your UI filters
    immediately.

You now have a fully client‑side autocomplete that reflects exactly
what's saved in the user's favorites---no external search service
needed.
