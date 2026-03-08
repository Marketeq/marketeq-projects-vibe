# **Frontend -- React Blocks for Section Temples**

Purpose: One place with **copy‑paste React (Next.js) components**. Every
block has:

- a **Default** state (what you see when you first add it),

- an **Edit** state (you can change things),

- a **Published** state (read‑only),

- and behaviors (like **delete when text is empty**, and **max 4
  columns**).

These blocks are **headless**: no drag‑and‑drop code inside. Your editor
(dnd‑kit) controls dragging, moving up/down, duplicating, etc. These
blocks expose small callbacks so the editor can control them.

## **0) Shared Types + Optional Action Bar**

**File:** components/blocks/types.ts

// A block can render in two modes:

// - \"edit\": author can change the content

// - \"published\": read‑only (what the client sees)

export type BlockMode = \"edit\" \| \"published\";

// Optional actions you may want to show above a block while editing.

// If you don\'t pass them, nothing breaks.

export type BlockActions = {

onMoveUp?: () =\> void;

onMoveDown?: () =\> void;

onDuplicate?: () =\> void;

onDelete?: () =\> void;

onToggleHidden?: () =\> void; // hide/show in published

hidden?: boolean;

};

**File:** components/blocks/BlockActionBar.tsx

import React from \"react\";

import { BlockActions } from \"./types\";

// Simple buttons for common actions while editing.

// You can replace this UI later. It\'s just here to help during MVP.

export default function BlockActionBar({

onMoveUp,

onMoveDown,

onDuplicate,

onDelete,

onToggleHidden,

hidden,

}: BlockActions) {

return (

\<div className=\"absolute -top-10 right-0 flex gap-2\"\>

\<button className=\"px-2 py-1 text-sm rounded bg-gray-200\"
onClick={onMoveUp} title=\"Move up\"\>↑\</button\>

\<button className=\"px-2 py-1 text-sm rounded bg-gray-200\"
onClick={onMoveDown} title=\"Move down\"\>↓\</button\>

\<button className=\"px-2 py-1 text-sm rounded bg-gray-200\"
onClick={onDuplicate} title=\"Duplicate\"\>⎘\</button\>

{onToggleHidden && (

\<button className=\"px-2 py-1 text-sm rounded bg-gray-200\"
onClick={onToggleHidden} title={hidden ? \"Show\" : \"Hide\"}\>

{hidden ? \"👁‍🗨\" : \"👁\"}

\</button\>

)}

\<button className=\"px-2 py-1 text-sm rounded bg-red-500 text-white\"
onClick={onDelete} title=\"Delete\"\>✕\</button\>

\</div\>

);

}



## **1) Text (Rich Text, delete when empty)**

**File:** components/blocks/TextBlock.tsx

import React, { useEffect, useRef } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* TextBlock

\* - Default: shows a placeholder.

\* - Edit: contentEditable. If the author deletes all text, we call
onRemove().

\* - Published: shows HTML as read‑only. (Sanitize on the server at
publish.)

\*/

export default function TextBlock({

mode,

html,

placeholder = \"Start typing...\",

onChange,

onRemove,

actions,

}: {

mode: BlockMode;

html: string; // rich text HTML

placeholder?: string;

onChange: (nextHtml: string) =\> void;

onRemove: () =\> void; // delete this block when text becomes empty

actions?: BlockActions;

}) {

const ref = useRef\<HTMLDivElement\>(null);

// Keep the editor DOM in sync if html changes from outside (e.g.
undo/redo)

useEffect(() =\> {

if (mode === \"edit\" && ref.current && ref.current.innerHTML !== (html
\|\| \"\")) {

ref.current.innerHTML = html \|\| \"\";

}

}, \[mode, html\]);

if (mode === \"published\") {

return (

\<section className=\"prose max-w-none\" dangerouslySetInnerHTML={{
\_\_html: html }} /\>

);

}

return (

\<div className=\"relative\"\>

{actions && \<BlockActionBar {\...actions} /\>}

\<div

ref={ref}

contentEditable

suppressContentEditableWarning

className=\"prose max-w-none w-full rounded-xl p-4 bg-white shadow-sm
ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500
min-h-\[80px\]\"

data-placeholder={placeholder}

onInput={(e) =\> {

const el = e.currentTarget as HTMLDivElement;

const textOnly = (el.innerText \|\| \"\").replace(/\\u200B/g,
\"\").trim();

if (!textOnly) {

// Figma‑style: once empty, remove the whole block

onRemove();

return;

}

const next = el.innerHTML.trim();

onChange(next);

}}

onBlur={(e) =\> {

const textOnly = (e.currentTarget.innerText \|\|
\"\").replace(/\\u200B/g, \"\").trim();

if (!textOnly) onRemove();

}}

/\>

\</div\>

);

}



## **2) Image (uses your upload API)**

**File:** components/blocks/ImageBlock.tsx

import React, { useRef } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* ImageBlock

\* - Default: shows an \"Add Image\" dropzone.

\* - Edit: Replace button + Alt text input. You provide
onPick(file)-\>url.

\* - Published: responsive image + optional caption (alt).

\*/

export default function ImageBlock({

mode,

url,

alt = \"\",

onPick, // (file) =\> Promise\<publicUrl\>

onChange, // (next { url, alt })

onRemove,

actions,

}: {

mode: BlockMode;

url?: string;

alt?: string;

onPick: (file: File) =\> Promise\<string\>;

onChange: (next: { url?: string; alt?: string }) =\> void;

onRemove: () =\> void;

actions?: BlockActions;

}) {

const inputRef = useRef\<HTMLInputElement\>(null);

if (mode === \"published\") {

return url ? (

\<figure className=\"my-6\"\>

\<img src={url} alt={alt \|\| \"\"} className=\"w-full h-auto rounded-xl
object-cover\" /\>

{alt ? \<figcaption className=\"text-sm text-gray-500
mt-2\"\>{alt}\</figcaption\> : null}

\</figure\>

) : null;

}

return (

\<div className=\"relative rounded-xl bg-white shadow-sm ring-1
ring-gray-200 p-3\"\>

{actions && \<BlockActionBar {\...actions} /\>}

{url ? (

\<img src={url} alt={alt \|\| \"\"} className=\"w-full h-auto rounded-lg
object-cover\" /\>

) : (

\<button

className=\"w-full aspect-\[16/9\] grid place-items-center text-gray-500
border-2 border-dashed rounded-lg\"

onClick={() =\> inputRef.current?.click()}

title=\"Add Image\"

\>

Add Image

\</button\>

)}

\<div className=\"mt-3 flex items-center gap-2\"\>

\<button

onClick={() =\> inputRef.current?.click()}

className=\"px-3 py-1 rounded bg-gray-100 hover:bg-gray-200\"

\>

{url ? \"Replace\" : \"Select\"} Image

\</button\>

\<input

ref={inputRef}

type=\"file\"

accept=\"image/\*\"

className=\"hidden\"

onChange={async (e) =\> {

const f = e.target.files?.\[0\];

if (!f) return;

const uploadedUrl = await onPick(f);

onChange({ url: uploadedUrl });

}}

/\>

\<input

placeholder=\"Image title / alt\"

value={alt \|\| \"\"}

onChange={(e) =\> onChange({ alt: e.target.value })}

className=\"flex-1 px-3 py-1 rounded border\"

/\>

\<button className=\"px-3 py-1 rounded bg-red-500 text-white\"
onClick={onRemove}\>Delete\</button\>

\</div\>

\</div\>

);

}



## **3) Columns (max 4, add/move/duplicate/delete columns)**

**File:** components/blocks/ColumnsBlock.tsx

import React from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* ColumnsBlock (resizable, max 4)

\*

\* - Desktop: uses a 12-column CSS grid. Each column has a \"span\"
(1..12).

\* All spans MUST sum to 12. Examples:

\* 2-equal =\> \[6,6\]

\* 3-equal =\> \[4,4,4\]

\* 4-equal =\> \[3,3,3,3\]

\* 2-33-66 =\> \[4,8\]

\* 2-66-33 =\> \[8,4\]

\* - Mobile: columns stack vertically (full width). We do this by:

\* grid-cols-1 on mobile + md:grid-cols-12 on desktop,

\* default col-span-1 on mobile + md:col-span-{span} on desktop.

\*

\* - Edit:

\* • Preset buttons (match design)

\* • \"Add Column\" (until 4 total). New column starts at an even split.

\* • Per-column actions: Resize - / + (shrink/grow), Move Left/Right,
Duplicate, Delete (if \>1)

\* • When one column grows, others shrink automatically to keep total =
12.

\* We shrink the largest other column by 1 (simple, predictable rule).

\*

\* - Published: same grid, no edit chrome.

\*

\* NOTE: We DO NOT implement drag/drop here. Your editor renders column
content via renderColumn(colId).

\*/

export type ColumnLayout =

\| \"1\"

\| \"2-equal\"

\| \"3-equal\"

\| \"4-equal\"

\| \"2-33-66\"

\| \"2-66-33\";

type Col = { id: string; span: number };

export default function ColumnsBlock({

mode,

layout,

columns,

// high-level block actions (move/hide/duplicate/delete the whole
Columns block)

actions,

// callbacks to mutate columns at the parent/editor level

onChangeLayout,

onAddColumn, // parent should create a new column id + span and push it
into columns

onUpdateColumns, // parent setter for the full columns array after we
change spans/order

onDeleteColumn,

// parent renders the actual items (sortable) for a given column id

renderColumn,

}: {

mode: BlockMode;

layout: ColumnLayout;

columns: Col\[\]; // columns with spans that sum to 12

actions?: BlockActions;

onChangeLayout: (next: ColumnLayout) =\> void;

onAddColumn: () =\> void; // parent must enforce max=4 before calling

onUpdateColumns: (next: Col\[\]) =\> void;

onDeleteColumn: (colId: string) =\> void;

renderColumn: (colId: string) =\> React.ReactNode;

}) {

// \-\-- Helpers
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

// Clamp value between min and max

const clamp = (n: number, min: number, max: number) =\> Math.max(min,
Math.min(max, n));

// Ensure spans sum exactly to 12 (safety net, but we keep them valid on
every change)

const normalize = (cols: Col\[\]): Col\[\] =\> {

const total = cols.reduce((s, c) =\> s + c.span, 0);

if (total === 12) return cols;

const diff = 12 - total; // positive =\> need to add; negative =\> need
to subtract

const dir = diff \> 0 ? 1 : -1;

let remaining = Math.abs(diff);

// Adjust columns starting from the largest (for subtraction) or
smallest (for addition)

const sorted = \[\...cols\].sort((a, b) =\> dir \> 0 ? a.span - b.span :
b.span - a.span);

for (const c of sorted) {

if (remaining === 0) break;

const step = dir; // +/-1

const next = clamp(c.span + step, 1, 12);

if (next !== c.span) {

const actual = Math.abs(next - c.span);

c.span = next;

remaining -= actual;

}

}

return \[\...cols\];

};

// Resize: grow (+1) or shrink (-1) given column, and take/give a unit
to another column

// Rule: when growing, subtract 1 from the largest OTHER column; when
shrinking, give 1 to the smallest OTHER column.

const resizeColumn = (colId: string, delta: 1 \| -1) =\> {

if (columns.length === 0) return;

const idx = columns.findIndex(c =\> c.id === colId);

if (idx \< 0) return;

const cols = \[\...columns\];

const target = cols\[idx\];

// Boundaries per column so layouts stay readable on desktop

const MIN = 2; // don\'t let a column be thinner than 2/12

const MAX = 10; // and don\'t let any single column hog everything

// Check if we can apply delta to target

const desired = clamp(target.span + delta, MIN, MAX);

if (desired === target.span) return; // no change possible

// Pick a donor/receiver column based on delta

const others = cols.filter(c =\> c.id !== colId);

if (delta === 1) {

// Need to take 1 unit from the LARGEST other column that can spare it

const donor = others

.filter(c =\> c.span \> MIN)

.sort((a, b) =\> b.span - a.span)\[0\];

if (!donor) return;

donor.span -= 1;

target.span += 1;

} else {

// delta === -1, we\'re shrinking target and must give 1 to the SMALLEST
other column

const receiver = others

.filter(c =\> c.span \< MAX)

.sort((a, b) =\> a.span - b.span)\[0\];

if (!receiver) return;

target.span -= 1;

receiver.span += 1;

}

onUpdateColumns(normalize(cols));

};

const moveColumnLeft = (colId: string) =\> {

const i = columns.findIndex(c =\> c.id === colId);

if (i \<= 0) return;

const next = \[\...columns\];

\[next\[i - 1\], next\[i\]\] = \[next\[i\], next\[i - 1\]\];

onUpdateColumns(next);

};

const moveColumnRight = (colId: string) =\> {

const i = columns.findIndex(c =\> c.id === colId);

if (i \< 0 \|\| i \>= columns.length - 1) return;

const next = \[\...columns\];

\[next\[i\], next\[i + 1\]\] = \[next\[i + 1\], next\[i\]\];

onUpdateColumns(next);

};

const duplicateColumn = (colId: string) =\> {

if (columns.length \>= 4) return; // respect max 4

const i = columns.findIndex(c =\> c.id === colId);

if (i \< 0) return;

// Duplicate with same span, then normalize (so the total stays 12)

const copy: Col = { id: \`\${colId}-copy-\${Date.now()}\`, span:
columns\[i\].span };

const next = \[\...columns.slice(0, i + 1), copy, \...columns.slice(i +
1)\];

onUpdateColumns(normalize(next));

};

// Map a preset to exact span arrays that sum to 12

const presetSpans: Record\<ColumnLayout, number\[\]\> = {

\"1\": \[12\],

\"2-equal\": \[6, 6\],

\"3-equal\": \[4, 4, 4\],

\"4-equal\": \[3, 3, 3, 3\],

\"2-33-66\": \[4, 8\],

\"2-66-33\": \[8, 4\],

};

const applyPreset = (preset: ColumnLayout) =\> {

const spans = presetSpans\[preset\];

if (!spans) return;

// If current column count differs, we either trim or create columns to
match.

const count = Math.min(spans.length, 4); // never exceed 4

const next: Col\[\] = \[\];

for (let i = 0; i \< count; i++) {

const existing = columns\[i\];

next.push({

id: existing?.id ?? \`col-\${i}-\${Date.now()}\`,

span: spans\[i\],

});

}

onChangeLayout(preset);

onUpdateColumns(next);

};

// \-\-- Render
\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--

// Map span number to Tailwind class for desktop (md: breakpoint).

// Mobile is always col-span-1 (stack).

const spanClass = (span: number) =\> \`col-span-1
md:col-span-\${span}\`;

const Grid = ({ children }: { children: React.ReactNode }) =\> (

\<section className={\`grid grid-cols-1 md:grid-cols-12 gap-6\`}\>

{children}

\</section\>

);

if (mode === \"published\") {

// PUBLISHED: read-only grid; mobile stacks vertically; desktop uses
md:col-span-{span}.

return (

\<Grid\>

{columns.map((col) =\> (

\<div key={col.id} className={spanClass(col.span)}\>

{renderColumn(col.id)}

\</div\>

))}

\</Grid\>

);

}

// EDIT: show presets, Add Column (max 4), and per-column controls
(Resize, Move, Duplicate, Delete)

return (

\<section className=\"relative\"\>

{/\* Optional global block actions bar \*/}

{actions && \<div className=\"relative\"\>\<BlockActionBar {\...actions}
/\>\</div\>}

{/\* Presets + Add Column \*/}

\<div className=\"mb-3 flex flex-wrap items-center gap-2\"\>

\<label className=\"text-sm font-medium\"\>Layout:\</label\>

{(\[\"1\",\"2-equal\",\"3-equal\",\"4-equal\",\"2-33-66\",\"2-66-33\"\]
as ColumnLayout\[\]).map((opt) =\> (

\<button

key={opt}

type=\"button\"

onClick={() =\> applyPreset(opt)}

className={\`px-2 py-1 rounded border text-sm \${layout === opt ?
\"bg-blue-600 text-white border-blue-600\" : \"bg-white\"}\`}

\>

{opt}

\</button\>

))}

\<button

type=\"button\"

className=\"ml-auto px-3 py-1 rounded bg-gray-100 hover:bg-gray-200
disabled:opacity-50\"

onClick={onAddColumn}

disabled={columns.length \>= 4}

title=\"Add a new column (max 4)\"

\>

\+ Add Column

\</button\>

\</div\>

{/\* Grid with per-column chips \*/}

\<Grid\>

{columns.map((col, i) =\> (

\<div key={col.id} className={\`\${spanClass(col.span)} relative\`}\>

{/\* Column control chips \*/}

\<div className=\"absolute -top-8 left-0 flex flex-wrap gap-2
text-xs\"\>

{/\* Resize \*/}

\<button

className=\"px-2 py-0.5 rounded bg-gray-200\"

onClick={() =\> resizeColumn(col.id, -1)}

title=\"Narrow this column\"

\>

-- width

\</button\>

\<button

className=\"px-2 py-0.5 rounded bg-gray-200\"

onClick={() =\> resizeColumn(col.id, +1)}

title=\"Widen this column\"

\>

\+ width

\</button\>

{/\* Move \*/}

\<button

className=\"px-2 py-0.5 rounded bg-gray-200 disabled:opacity-50\"

onClick={() =\> moveColumnLeft(col.id)}

disabled={i === 0}

title=\"Move left\"

\>

← left

\</button\>

\<button

className=\"px-2 py-0.5 rounded bg-gray-200 disabled:opacity-50\"

onClick={() =\> moveColumnRight(col.id)}

disabled={i === columns.length - 1}

title=\"Move right\"

\>

right →

\</button\>

{/\* Duplicate \*/}

\<button

className=\"px-2 py-0.5 rounded bg-gray-200 disabled:opacity-50\"

onClick={() =\> duplicateColumn(col.id)}

disabled={columns.length \>= 4}

title=\"Duplicate column\"

\>

Duplicate

\</button\>

{/\* Delete (only if more than 1 column) \*/}

{columns.length \> 1 && (

\<button

className=\"px-2 py-0.5 rounded bg-red-500 text-white\"

onClick={() =\> onDeleteColumn(col.id)}

title=\"Delete column\"

\>

Delete

\</button\>

)}

\</div\>

{/\* Column dropzone / content (your editor renders items here) \*/}

\<div className=\"rounded-xl border border-dashed p-4 bg-white
min-h-\[120px\]\"\>

{renderColumn(col.id) \|\| \<div className=\"text-gray-400
text-sm\"\>Drag your fields here\</div\>}

\</div\>

\</div\>

))}

\</Grid\>

\</section\>

);

}



## **4) Video (URL; you already have the resource)**

**File:** components/blocks/VideoBlock.tsx

import React, { useState } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* VideoBlock

\* - Default: empty URL field.

\* - Edit: paste a video URL and optional title. You can validate the
URL.

\* - Published: responsive iframe (server can rewrite to a safe embed
URL).

\*/

export default function VideoBlock({

mode,

url,

title,

onChange,

onRemove,

actions,

}: {

mode: BlockMode;

url: string;

title?: string;

onChange: (next: { url?: string; title?: string }) =\> void;

onRemove: () =\> void;

actions?: BlockActions;

}) {

const \[local, setLocal\] = useState({ url: url \|\| \"\", title: title
\|\| \"\" });

if (mode === \"published\") {

const embedUrl = url; // optionally rewrite on server

return (

\<section className=\"my-6\"\>

{title ? \<h3 className=\"text-lg font-semibold mb-2\"\>{title}\</h3\> :
null}

\<div className=\"aspect-video rounded-xl overflow-hidden bg-black\"\>

\<iframe

className=\"w-full h-full\"

src={embedUrl}

title={title \|\| \"video\"}

allow=\"accelerometer; autoplay; clipboard-write; encrypted-media;
gyroscope; picture-in-picture; web-share\"

allowFullScreen

/\>

\</div\>

\</section\>

);

}

return (

\<div className=\"relative rounded-xl bg-white shadow-sm ring-1
ring-gray-200 p-3\"\>

{actions && \<BlockActionBar {\...actions} /\>}

\<div className=\"flex flex-col gap-2\"\>

\<input

className=\"px-3 py-2 rounded border\"

placeholder=\"Paste video URL (YouTube, Vimeo, ...)\"

value={local.url}

onChange={(e) =\> {

const url = e.target.value.trim();

setLocal((s) =\> ({ \...s, url }));

onChange({ url });

}}

/\>

\<input

className=\"px-3 py-2 rounded border\"

placeholder=\"Optional title\"

value={local.title}

onChange={(e) =\> {

const title = e.target.value;

setLocal((s) =\> ({ \...s, title }));

onChange({ title });

}}

/\>

\<div className=\"mt-2\"\>

\<button className=\"px-3 py-1 rounded bg-red-500 text-white\"
onClick={onRemove}\>Delete\</button\>

\</div\>

\</div\>

\</div\>

);

}



## **5) Emoji (you already have the picker)**

**File:** components/blocks/EmojiBlock.tsx

import React from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* EmojiBlock

\* - Default: shows a generic emoji.

\* - Edit: pick/change emoji via onPick().

\* - Published: shows the emoji at display size.

\*/

export default function EmojiBlock({

mode,

emoji,

onPick, // opens your emoji picker; returns a string like \"🚀\"

onChange, // set new emoji

onRemove,

actions,

}: {

mode: BlockMode;

emoji?: string;

onPick: () =\> Promise\<string\>;

onChange: (next: { emoji?: string }) =\> void;

onRemove: () =\> void;

actions?: BlockActions;

}) {

if (mode === \"published\") {

return emoji ? \<div className=\"text-4xl\"\>{emoji}\</div\> : null;

}

return (

\<div className=\"relative rounded-xl bg-white shadow-sm ring-1
ring-gray-200 p-3\"\>

{actions && \<BlockActionBar {\...actions} /\>}

\<div className=\"flex items-center gap-3\"\>

\<div className=\"text-4xl\"\>{emoji \|\| \"🙂\"}\</div\>

\<button

className=\"px-3 py-1 rounded bg-gray-100 hover:bg-gray-200\"

onClick={async () =\> {

const chosen = await onPick();

onChange({ emoji: chosen });

}}

\>

{emoji ? \"Change Emoji\" : \"Pick Emoji\"}

\</button\>

\<button className=\"ml-auto px-3 py-1 rounded bg-red-500 text-white\"
onClick={onRemove}\>Delete\</button\>

\</div\>

\</div\>

);

}



## **6) Prototype (Figma or Framer) -- embedded**

**File:** components/blocks/PrototypeBlock.tsx

import React, { useState } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

// Only allow Figma or Framer for now.

export type PrototypeProvider = \"figma\" \| \"framer\";

function toEmbedUrl(provider: PrototypeProvider, url: string): string {

// NOTE: For real security, do final validation/rewriting on the server.

if (provider === \"figma\") {

// Accepts https://www.figma.com/file/\... or /proto/\... and returns
embed URL.

// Quick path: if it already has /embed, keep it. Otherwise wrap it.

if (url.includes(\"/embed\")) return url;

const encoded = encodeURIComponent(url);

return
\`https://www.figma.com/embed?embed_host=yourapp&url=\${encoded}\`;

}

// Framer: their share links already work well in iframes.

return url;

}

/\*\*

\* PrototypeBlock

\* - Default: empty provider + URL inputs.

\* - Edit: choose provider (Figma/Framer), paste URL, optional title.

\* - Published: iframe embed, responsive.

\*/

export default function PrototypeBlock({

mode,

provider,

url,

title,

onChange,

onRemove,

actions,

}: {

mode: BlockMode;

provider: PrototypeProvider;

url: string;

title?: string;

onChange: (next: { provider?: PrototypeProvider; url?: string; title?:
string }) =\> void;

onRemove: () =\> void;

actions?: BlockActions;

}) {

const \[local, setLocal\] = useState({ provider, url, title: title \|\|
\"\" });

if (mode === \"published\") {

const src = toEmbedUrl(provider, url);

return (

\<section className=\"my-6\"\>

{title ? \<h3 className=\"text-lg font-semibold mb-2\"\>{title}\</h3\> :
null}

\<div className=\"aspect-video rounded-xl overflow-hidden bg-black\"\>

\<iframe className=\"w-full h-full\" src={src} title={title \|\|
\"prototype\"} allowFullScreen /\>

\</div\>

\</section\>

);

}

return (

\<div className=\"relative rounded-xl bg-white shadow-sm ring-1
ring-gray-200 p-3\"\>

{actions && \<BlockActionBar {\...actions} /\>}

\<div className=\"flex flex-col md:flex-row gap-2 mb-2\"\>

\<label className=\"flex items-center gap-2\"\>

\<input

type=\"radio\"

name=\"provider\"

checked={local.provider === \"figma\"}

onChange={() =\> { setLocal((s) =\> ({ \...s, provider: \"figma\" }));
onChange({ provider: \"figma\" }); }}

/\>

\<span\>Figma\</span\>

\</label\>

\<label className=\"flex items-center gap-2\"\>

\<input

type=\"radio\"

name=\"provider\"

checked={local.provider === \"framer\"}

onChange={() =\> { setLocal((s) =\> ({ \...s, provider: \"framer\" }));
onChange({ provider: \"framer\" }); }}

/\>

\<span\>Framer\</span\>

\</label\>

\</div\>

\<input

className=\"px-3 py-2 rounded border w-full\"

placeholder={local.provider === \"figma\" ? \"Paste Figma link\" :
\"Paste Framer link\"}

value={local.url}

onChange={(e) =\> {

const url = e.target.value.trim();

setLocal((s) =\> ({ \...s, url }));

onChange({ url });

}}

/\>

\<input

className=\"mt-2 px-3 py-2 rounded border w-full\"

placeholder=\"Optional title\"

value={local.title}

onChange={(e) =\> {

const title = e.target.value;

setLocal((s) =\> ({ \...s, title }));

onChange({ title });

}}

/\>

{/\* Live preview while editing \*/}

{local.url && (

\<div className=\"mt-3 aspect-video rounded-xl overflow-hidden
bg-black\"\>

\<iframe className=\"w-full h-full\" src={toEmbedUrl(local.provider,
local.url)} title=\"Prototype preview\" /\>

\</div\>

)}

\<div className=\"mt-3\"\>

\<button className=\"px-3 py-1 rounded bg-red-500 text-white\"
onClick={onRemove}\>Delete\</button\>

\</div\>

\</div\>

);

}



### **That's it**

- All blocks include **Default**, **Edit**, and **Published** states.

- **Text** deletes itself when empty (like Figma text layers).

- **Columns** allows up to **4 columns** and lets you
  add/move/duplicate/delete columns.

- **Video** and **Prototype** are URL‑based and show a live preview in
  Edit; published is an iframe.

- **Emoji** calls your picker.
