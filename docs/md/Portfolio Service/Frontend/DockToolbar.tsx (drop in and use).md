## **Draggable Toolbar Component**  Here's a single, focused, copy-paste component that gives you a draggable toolbar which pins to the left or right edge of the screen. It always snaps so that the horizontal center of the toolbar overlaps the canvas edge, and it keeps the vertical position where you dropped it. Works with mouse and touch, remembers position in localStorage, and uses Tailwind.  **DockToolbar.tsx (drop in and use)**

****import React, { useCallback, useEffect, useLayoutEffect, useRef,
useState } from \"react\";

/\*\*

\* DockToolbar

\*

\* What it does:

\* - Drags anywhere vertically; on drop it \*pins\* to left or right
edge only.

\* - When pinned:

\* • LEFT: the toolbar\'s horizontal CENTER lines up with the left edge
(half off-screen).

\* • RIGHT: the toolbar\'s horizontal CENTER lines up with the right
edge (half off-screen).

\* - Keeps the vertical position where you dropped it (clamped so it
never goes off-screen).

\* - Remembers side + vertical center in localStorage.

\* - Works with mouse + touch; has simple keyboard nudging for
accessibility.

\*

\* How to use:

\* \<DockToolbar

\* items={\[

\* { id: \"text\", label: \"Text\", onClick: () =\> addText() },

\* { id: \"image\", label: \"Image\", onClick: () =\> addImage() },

\* { id: \"columns\",label: \"Columns\",onClick: () =\> addColumns() },

\* { id: \"video\", label: \"Video\", onClick: () =\> addVideo() },

\* { id: \"emoji\", label: \"Emoji\", onClick: () =\> addEmoji() },

\* { id: \"proto\", label: \"Proto\", onClick: () =\> addPrototype() },

\* \]}

\* /\>

\*/

type Side = \"left\" \| \"right\";

type ToolbarItem = {

id: string;

label: string;

onClick: () =\> void;

};

type Props = {

items: ToolbarItem\[\];

storageKey?: string; // customize if you need multiple toolbars on a
page

};

export default function DockToolbar({ items, storageKey =
\"dock-toolbar\" }: Props) {

// \-\-\-- POSITION STATE
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

// We store:

// - side: \"left\" \| \"right\"

// - centerY: vertical center of the toolbar in px (relative to
viewport)

const \[side, setSide\] = useState\<Side\>(\"left\");

const \[centerY, setCenterY\] = useState\<number\>(window.innerHeight /
2);

// During drag we keep raw x/y; on drop we compute side + clamp centerY

const \[dragging, setDragging\] = useState(false);

const \[dragY, setDragY\] = useState\<number \| null\>(null);

// Measure toolbar size to clamp vertical position correctly

const ref = useRef\<HTMLDivElement\>(null);

const \[size, setSize\] = useState({ w: 0, h: 0 });

// Load saved position once

useLayoutEffect(() =\> {

try {

const saved = JSON.parse(localStorage.getItem(storageKey) \|\|
\"null\");

if (saved && (saved.side === \"left\" \|\| saved.side === \"right\") &&
typeof saved.centerY === \"number\") {

setSide(saved.side);

setCenterY(saved.centerY);

}

} catch {}

}, \[storageKey\]);

// Save position whenever it changes

useEffect(() =\> {

localStorage.setItem(storageKey, JSON.stringify({ side, centerY }));

}, \[side, centerY, storageKey\]);

// Re-measure on mount and on resize

const measure = useCallback(() =\> {

const el = ref.current;

if (!el) return;

const rect = el.getBoundingClientRect();

setSize({ w: rect.width, h: rect.height });

// Clamp centerY if window height changed

const minCY = rect.height / 2 + 8; // padding from top

const maxCY = window.innerHeight - rect.height / 2 - 8; // padding from
bottom

setCenterY((cy) =\> Math.min(Math.max(cy, minCY), maxCY));

}, \[\]);

useEffect(() =\> {

measure();

const onResize = () =\> measure();

window.addEventListener(\"resize\", onResize);

return () =\> window.removeEventListener(\"resize\", onResize);

}, \[measure\]);

// \-\-\-- DRAG LOGIC
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

// We only care about Y while dragging, but we use X at drop to decide
side.

const startDrag = (clientY: number) =\> {

setDragging(true);

setDragY(clientY);

};

const onPointerDown = (e: React.PointerEvent) =\> {

// Only start drag from the \"handle\" area (we\'ll mark it with
data-role)

const target = e.target as HTMLElement;

if (!target.closest(\"\[data-role=\'handle\'\]\")) return;

(e.target as HTMLElement).setPointerCapture(e.pointerId);

startDrag(e.clientY);

};

const onPointerMove = (e: React.PointerEvent) =\> {

if (!dragging) return;

setDragY(e.clientY);

};

const onPointerUp = (e: React.PointerEvent) =\> {

if (!dragging) return;

setDragging(false);

// Decide side by drop X (which half of the screen)

const dropX = e.clientX;

const newSide: Side = dropX \< window.innerWidth / 2 ? \"left\" :
\"right\";

setSide(newSide);

// Clamp vertical center to keep toolbar fully visible

const h = size.h \|\| 200;

const minCenter = h / 2 + 8;

const maxCenter = window.innerHeight - h / 2 - 8;

const nextCY = clamp(dragY ?? centerY, minCenter, maxCenter);

setCenterY(nextCY);

setDragY(null);

};

// Touch support via pointer events works on modern browsers; no
separate handlers needed.

// During drag, we want the toolbar center to follow the pointer Y

const currentCenterY = dragging && dragY != null ? dragY : centerY;

// Clamp helper

function clamp(n: number, min: number, max: number) {

return Math.max(min, Math.min(max, n));

}

// \-\-\-- STYLES / POSITIONING
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

// We use fixed positioning with:

// - LEFT side: left: 0; transform: translateX(-50%); (center overlaps
left edge)

// - RIGHT side: right: 0; transform: translateX( 50%); (center overlaps
right edge)

//

// Vertical position: place so that the \*center\* equals
currentCenterY:

// top = currentCenterY - toolbarHeight / 2

const topPx = Math.round(currentCenterY - size.h / 2);

const sideStyle: React.CSSProperties =

side === \"left\"

? { left: 0, transform: \"translateX(-50%)\" }

: { right: 0, transform: \"translateX(50%)\" };

// Smooth snap when we release

const transition = dragging ? \"none\" : \"top 160ms ease, transform
160ms ease, left 160ms ease, right 160ms ease\";

// \-\-\-- KEYBOARD NUDGE (accessibility)
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

const onKeyDown = (e: React.KeyboardEvent) =\> {

if (e.key === \"ArrowUp\" \|\| e.key === \"ArrowDown\") {

e.preventDefault();

const step = e.shiftKey ? 20 : 6;

const delta = e.key === \"ArrowUp\" ? -step : step;

const h = size.h \|\| 200;

const minCenter = h / 2 + 8;

const maxCenter = window.innerHeight - h / 2 - 8;

setCenterY((cy) =\> clamp(cy + delta, minCenter, maxCenter));

} else if (e.key === \"ArrowLeft\") {

setSide(\"left\");

} else if (e.key === \"ArrowRight\") {

setSide(\"right\");

}

};

return (

\<div

ref={ref}

role=\"region\"

aria-label=\"Block toolbar\"

tabIndex={0}

onKeyDown={onKeyDown}

// FIXED: follows viewport; sits above canvas

className=\"fixed z-50 select-none\"

// Positioning and snap animation

style={{ top: topPx, transition, \...sideStyle }}

// Drag handlers (pointer events = mouse + touch)

onPointerDown={onPointerDown}

onPointerMove={onPointerMove}

onPointerUp={onPointerUp}

\>

{/\* Outer frame (rounded pill) \*/}

\<div className=\"rounded-2xl shadow-lg ring-1 ring-black/10 bg-white
overflow-hidden\"\>

{/\* Drag handle (only this area starts the drag) \*/}

\<div

data-role=\"handle\"

className=\"cursor-grab active:cursor-grabbing flex items-center
justify-center px-3 py-2 bg-gray-50 text-gray-600 text-xs
tracking-wide\"

title=\"Drag to dock left or right\"

\>

Drag to Dock

\</div\>

{/\* Items list \*/}

\<ul className=\"flex flex-col\"\>

{items.map((it) =\> (

\<li key={it.id}\>

\<button

type=\"button\"

className=\"w-full text-left px-4 py-2 hover:bg-gray-100 text-sm\"

onClick={it.onClick}

\>

{it.label}

\</button\>

\</li\>

))}

\</ul\>

\</div\>

\</div\>

);

}



## **Usage (example)**

****// Example: somewhere in your editor page

import DockToolbar from \"@/components/DockToolbar\";

import { nanoid } from \"nanoid\";

export default function EditorPage() {

// \... your state and block adders \...

function addText() { /\* push a Text block \*/ }

function addImage() { /\* push an Image block \*/ }

function addColumns() { /\* push a Columns block \*/ }

function addVideo() { /\* push a Video block \*/ }

function addEmoji() { /\* push an Emoji block \*/ }

function addPrototype() { /\* push a Prototype block \*/ }

return (

\<\>

{/\* your editor canvas \... \*/}

\<DockToolbar

items={\[

{ id: \"text\", label: \"Text\", onClick: addText },

{ id: \"image\", label: \"Image\", onClick: addImage },

{ id: \"columns\", label: \"Columns\", onClick: addColumns },

{ id: \"video\", label: \"Video\", onClick: addVideo },

{ id: \"emoji\", label: \"Emoji\", onClick: addEmoji },

{ id: \"proto\", label: \"Prototype\", onClick: addPrototype },

\]}

/\>

\</\>

);

}



## **Notes / Behavior Recap**

- **Only two positions**: left or right. The **drop X** decides.

- **Overlap rule**: toolbar center aligns to the edge, so it sits half
  inside, half outside the canvas.

- **Vertical**: wherever you drop it. We clamp so it never goes
  off-screen.

- **Responsive**: fixed to viewport; unaffected by canvas scroll.

- **Persistence**: saves { side, centerY } to localStorage.

- **A11y**: focusable; ArrowUp/Down nudges; ArrowLeft/Right switches
  side.

- **Styling**: Tailwind-based; feel free to brand it.

- **No dnd-kit needed** for this---pointer events are simpler for a
  single draggable.
