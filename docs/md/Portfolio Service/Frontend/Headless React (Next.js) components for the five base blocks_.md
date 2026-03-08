**Headless React (Next.js)** components for the five base blocks:

- Text (rich text, **delete-on-empty**)

- Image

- Columns (**max 8**, add column, layout presets, column actions)

- Video (URL-based, using your existing resource)

- Emoji (using your existing resource)

Everything is built to be **dnd-kit friendly** (no drag logic inside the
blocks; your editor layer controls drag/drop, selection, move up/down,
duplicate, delete, hide). Each block exposes **Edit** and **Published**
modes and uses callbacks so your editor can orchestrate state.

### **0) Shared types and a tiny action bar (used by all blocks)**

**components/blocks/types.ts**

****// Shared types across blocks

// Each block renders in either Edit (authoring) or Published
(read-only) mode.

export type BlockMode = \"edit\" \| \"published\";

// Common props for a tiny action bar your editor can show on selection
(optional).

// These are NO-OP defaults in case you don\'t pass handlers, so blocks
are safe to render standalone.

export type BlockActions = {

onMoveUp?: () =\> void;

onMoveDown?: () =\> void;

onDuplicate?: () =\> void;

onDelete?: () =\> void;

onToggleHidden?: () =\> void; // optional \"hide/show\" toggle

hidden?: boolean; // current visibility state

};

**components/blocks/BlockActionBar.tsx**

****import React from \"react\";

import { BlockActions } from \"./types\";

/\*\*

\* Headless, optional action bar shown only in Edit mode.

\* You can hide it entirely and render your own chrome from the parent
editor.

\*/

export default function BlockActionBar({

onMoveUp, onMoveDown, onDuplicate, onDelete, onToggleHidden, hidden,

}: BlockActions) {

return (

\<div className=\"absolute -top-10 right-0 flex gap-2\"\>

{/\* Move Up \*/}

\<button

type=\"button\"

className=\"px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300\"

onClick={onMoveUp}

title=\"Move block up\"

\>

↑

\</button\>

{/\* Move Down \*/}

\<button

type=\"button\"

className=\"px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300\"

onClick={onMoveDown}

title=\"Move block down\"

\>

↓

\</button\>

{/\* Duplicate \*/}

\<button

type=\"button\"

className=\"px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300\"

onClick={onDuplicate}

title=\"Duplicate block\"

\>

⎘

\</button\>

{/\* Hide/Show \*/}

{onToggleHidden && (

\<button

type=\"button\"

className=\"px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300\"

onClick={onToggleHidden}

title={hidden ? \"Show block\" : \"Hide block\"}

\>

{hidden ? \"👁‍🗨\" : \"👁\"}

\</button\>

)}

{/\* Delete \*/}

\<button

type=\"button\"

className=\"px-2 py-1 text-sm rounded bg-red-500 text-white
hover:bg-red-600\"

onClick={onDelete}

title=\"Delete block\"

\>

✕

\</button\>

\</div\>

);

}



### **1) Text (rich text, delete-on-empty)**

**components/blocks/TextBlock.tsx**

****import React, { useEffect, useRef } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* TextBlock

\* - Edit mode: contentEditable div for rich text editing (your editor
sanitizes on save/publish).

\* - Published mode: read-only HTML (should be sanitized server-side at
publish time).

\* - Figma-style delete-on-empty: if the user clears all text, we call
onRemove() immediately.

\* - Headless: no drag logic; your dnd-kit layer handles selection and
reordering.

\*/

export default function TextBlock({

mode,

html,

placeholder = \"Start typing...\",

// block mutations (provided by parent editor)

onChange,

onRemove,

// optional action bar callbacks

actions,

}: {

mode: BlockMode;

html: string; // rich text HTML (you control formatting toolbar in your
editor)

placeholder?: string;

onChange: (nextHtml: string) =\> void;

onRemove: () =\> void; // called when text becomes empty (delete block)

actions?: BlockActions;

}) {

const ref = useRef\<HTMLDivElement\>(null);

// Keep the editable DOM in sync when the model changes externally
(e.g., undo/redo).

useEffect(() =\> {

if (mode === \"edit\" && ref.current && ref.current.innerHTML !== (html
\|\| \"\")) {

ref.current.innerHTML = html \|\| \"\";

}

}, \[mode, html\]);

if (mode === \"published\") {

// PUBLISHED: render server-sanitized HTML; no interactive chrome.

return (

\<section

className=\"prose max-w-none\"

// IMPORTANT: sanitization should happen on the server during publish.

// Here we rely on that (do NOT trust client HTML in production).

dangerouslySetInnerHTML={{ \_\_html: html }}

/\>

);

}

// EDIT: contentEditable with delete-on-empty behavior + optional action
bar.

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

// Soft placeholder: visible only when empty.

data-placeholder={placeholder}

onInput={(e) =\> {

const el = e.currentTarget as HTMLDivElement;

// \"next\" is the serialized HTML produced by the browser.

// Your editor can later normalize/sanitize this HTML.

const next = el.innerHTML.trim();

// IMPORTANT: delete-on-empty (Figma-style).

// We must check text \*content\* not just HTML (e.g.,
\"\<p\>\<br/\>\</p\>\" is \"empty\").

const textOnly = (el.innerText \|\| \"\").replace(/\\u200B/g,
\"\").trim();

if (!textOnly) {

onRemove();

return;

}

onChange(next);

}}

onBlur={(e) =\> {

const textOnly = (e.currentTarget.innerText \|\|
\"\").replace(/\\u200B/g, \"\").trim();

// Safety net: also delete on blur if empty.

if (!textOnly) onRemove();

}}

/\>

\</div\>

);

}



### **2) Image (uses your existing upload resource)**

**components/blocks/ImageBlock.tsx**

****import React, { useRef } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* ImageBlock

\* - Edit mode:

\* - shows current image (if any) and a Replace button

\* - or an \"Add Image\" dropzone/button

\* - delegates upload/pick to your existing media endpoint via
onPick(file) -\> url

\* - Published mode: responsive image + optional figcaption (from
alt/title)

\* - Headless: no drag logic; your dnd-kit layer handles reordering.

\*/

export default function ImageBlock({

mode,

url,

alt = \"\",

onPick, // (file) =\> Promise\<publicUrl\>

onChange, // (next { url, alt }) =\> void

onRemove, // delete block on explicit user action (image doesn\'t
auto-delete)

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

// PUBLISHED: static figure

return url ? (

\<figure className=\"my-6\"\>

\<img src={url} alt={alt \|\| \"\"} className=\"w-full h-auto rounded-xl
object-cover\" /\>

{alt ? \<figcaption className=\"text-sm text-gray-500
mt-2\"\>{alt}\</figcaption\> : null}

\</figure\>

) : null;

}

// EDIT: selectable/replaceable image + alt input + explicit Delete in
your chrome.

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

title={url ? \"Replace image\" : \"Select image\"}

\>

{url ? \"Replace\" : \"Select\"} Image

\</button\>

{/\* Hidden file input; we call your picker/upload, then set URL via
onChange \*/}

\<input

ref={inputRef}

type=\"file\"

accept=\"image/\*\"

className=\"hidden\"

onChange={async (e) =\> {

const f = e.target.files?.\[0\];

if (!f) return;

const uploadedUrl = await onPick(f); // \<- your media service

onChange({ url: uploadedUrl });

}}

/\>

{/\* Title/alt text (used as caption in published mode) \*/}

\<input

placeholder=\"Image title / alt\"

value={alt \|\| \"\"}

onChange={(e) =\> onChange({ alt: e.target.value })}

className=\"flex-1 px-3 py-1 rounded border\"

/\>

{/\* Optional explicit delete \*/}

\<button

className=\"px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600\"

onClick={onRemove}

title=\"Delete image block\"

\>

Delete

\</button\>

\</div\>

\</div\>

);

}



### **3) Columns (max 8; add/duplicate/move/remove columns; layout presets)**

**components/blocks/ColumnsBlock.tsx**

****import React from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* ColumnsBlock

\* - A headless container that defines N columns (max 8) and renders
child slots.

\* - We don\'t implement drag/drop here; your editor wraps each column
with dnd-kit

\* SortableContext and renders column items as SortableItem children.

\* - Edit mode:

\* - shows layout presets and \"Add Column\" (up to 8)

\* - column-level actions: Move Left/Right, Duplicate Column, Delete
Column

\* - Published mode:

\* - renders a responsive grid that displays children (already rendered)
in each column slot

\*

\* HOW TO USE:

\* The parent editor passes \`renderColumn\` to render the content of
each column (e.g., list of block React nodes).

\* The parent also handles all item-level drag/drop and actions.

\*/

export type ColumnLayout =

\| \"1\"

\| \"2-equal\"

\| \"3-equal\"

\| \"4-equal\"

\| \"5-equal\"

\| \"6-equal\"

\| \"7-equal\"

\| \"8-equal\"

\| \"2-33-66\"

\| \"2-66-33\";

export default function ColumnsBlock({

mode,

layout,

columns,

// column management

onAddColumn,

onMoveColumnLeft,

onMoveColumnRight,

onDuplicateColumn,

onDeleteColumn,

onChangeLayout,

// render prop: parent supplies the column content (already mapped via
dnd-kit)

renderColumn,

// optional block action bar (move/hide/duplicate/delete this WHOLE
Columns block)

actions,

}: {

mode: BlockMode;

layout: ColumnLayout;

columns: { id: string }\[\]; // only the identities; content is rendered
via renderColumn(id)

onAddColumn: () =\> void; // add empty column at end (enforced max 8 in
parent)

onMoveColumnLeft: (colId: string) =\> void;

onMoveColumnRight: (colId: string) =\> void;

onDuplicateColumn: (colId: string) =\> void;

onDeleteColumn: (colId: string) =\> void;

onChangeLayout: (next: ColumnLayout) =\> void;

renderColumn: (colId: string) =\> React.ReactNode;

actions?: BlockActions;

}) {

// Tailwind classes for common equal layouts (parent can choose more
complex ones).

const gridCols = {

\"1\": \"grid-cols-1\",

\"2-equal\": \"grid-cols-1 md:grid-cols-2\",

\"3-equal\": \"grid-cols-1 md:grid-cols-3\",

\"4-equal\": \"grid-cols-1 md:grid-cols-4\",

\"5-equal\": \"grid-cols-1 md:grid-cols-5\",

\"6-equal\": \"grid-cols-1 md:grid-cols-6\",

\"7-equal\": \"grid-cols-1 md:grid-cols-7\",

\"8-equal\": \"grid-cols-1 md:grid-cols-8\",

\"2-33-66\": \"grid-cols-1 md:grid-cols-\[1fr_2fr\]\", // requires
Tailwind arbitrary values enabled

\"2-66-33\": \"grid-cols-1 md:grid-cols-\[2fr_1fr\]\",

}\[layout\] \|\| \"grid-cols-1\";

if (mode === \"published\") {

// PUBLISHED: grid with rendered children

return (

\<section className={\`grid \${gridCols} gap-6\`}\>

{columns.map((col) =\> (

\<div key={col.id}\>{renderColumn(col.id)}\</div\>

))}

\</section\>

);

}

// EDIT: show layout chooser + column controls. Parent enforces max=8 in
onAddColumn.

return (

\<section className=\"relative\"\>

{actions && \<BlockActionBar {\...actions} /\>}

{/\* Layout selector (you can style as a segmented control) \*/}

\<div className=\"mb-3 flex flex-wrap items-center gap-2\"\>

\<label className=\"text-sm font-medium\"\>Layout:\</label\>

{\[\"1\",\"2-equal\",\"3-equal\",\"4-equal\",\"5-equal\",\"6-equal\",\"7-equal\",\"8-equal\",\"2-33-66\",\"2-66-33\"\].map((opt)
=\> (

\<button

key={opt}

type=\"button\"

onClick={() =\> onChangeLayout(opt as ColumnLayout)}

className={\`px-2 py-1 rounded border text-sm \${layout === opt ?
\"bg-blue-600 text-white border-blue-600\" : \"bg-white\"}\`}

\>

{opt}

\</button\>

))}

\<button

type=\"button\"

className=\"ml-auto px-3 py-1 rounded bg-gray-100 hover:bg-gray-200\"

onClick={onAddColumn}

title=\"Add a new column (max 8)\"

\>

\+ Add Column

\</button\>

\</div\>

{/\* The column grid (droppable areas rendered by parent via
renderColumn) \*/}

\<div className={\`grid \${gridCols} gap-6\`}\>

{columns.map((col, i) =\> (

\<div key={col.id} className=\"rounded-xl border border-dashed p-4
bg-white relative\"\>

{/\* Column action chips; your editor can also render these outside if
you prefer \*/}

\<div className=\"absolute -top-8 left-0 flex gap-2 text-xs\"\>

\<button className=\"px-2 py-0.5 rounded bg-gray-200\" onClick={() =\>
onMoveColumnLeft(col.id)}\>

← Left

\</button\>

\<button className=\"px-2 py-0.5 rounded bg-gray-200\" onClick={() =\>
onMoveColumnRight(col.id)}\>

Right →

\</button\>

\<button className=\"px-2 py-0.5 rounded bg-gray-200\" onClick={() =\>
onDuplicateColumn(col.id)}\>

Duplicate

\</button\>

{/\* Prevent deleting the last remaining column \*/}

{columns.length \> 1 && (

\<button className=\"px-2 py-0.5 rounded bg-red-500 text-white\"
onClick={() =\> onDeleteColumn(col.id)}\>

Delete

\</button\>

)}

\</div\>

{/\* Parent renders the actual items (e.g., dnd-kit SortableContext +
SortableItem children) \*/}

{renderColumn(col.id) \|\| (

\<div className=\"text-gray-400 text-sm\"\>Drag your fields here\</div\>

)}

\</div\>

))}

\</div\>

\</section\>

);

}

> **Max columns rule:** enforce in your parent editor before calling
> onAddColumn (e.g., if (columns.length \< 8) onAddColumn()).

### **4) Video (URL-based, uses your existing resource)**

**components/blocks/VideoBlock.tsx**

****import React, { useState } from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* VideoBlock

\* - Edit mode:

\* - paste/enter a video URL (YouTube/Vimeo/etc. --- your resource
decides)

\* - optional title/label

\* - Published mode:

\* - responsive embed (we use plain \<iframe\> as a safe default; your
server

\* can transform URLs to the correct embed endpoint during publish)

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

const \[local, setLocal\] = useState({ url, title: title \|\| \"\" });

if (mode === \"published\") {

// PUBLISHED: render as iframe embed; ensure you sanitize/whitelist
domains on server.

const embedUrl = url; // optionally map to embed URL on the server

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

// EDIT: simple URL + title fields

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

\<div className=\"text-xs text-gray-500\"\>

Tip: Your backend can rewrite this URL to a secure embed URL during
publish.

\</div\>

\<div className=\"mt-2\"\>

\<button

className=\"px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600\"

onClick={onRemove}

title=\"Delete video block\"

\>

Delete

\</button\>

\</div\>

\</div\>

\</div\>

);

}



### **5) Emoji (picker provided by your existing resource)**

**components/blocks/EmojiBlock.tsx**

****import React from \"react\";

import BlockActionBar from \"./BlockActionBar\";

import type { BlockActions, BlockMode } from \"./types\";

/\*\*

\* EmojiBlock

\* - Edit mode:

\* - shows current emoji or \"Pick Emoji\"

\* - calls onPick() to open your existing emoji selector; expects the
chosen emoji (string)

\* - Published mode:

\* - renders the emoji in display size consistent with your typography

\*/

export default function EmojiBlock({

mode,

emoji,

onPick, // opens your emoji picker; returns a string (e.g., \"🚀\")

onChange, // set the new emoji value

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

const chosen = await onPick(); // \<- your resource

onChange({ emoji: chosen });

}}

\>

{emoji ? \"Change Emoji\" : \"Pick Emoji\"}

\</button\>

\<button

className=\"ml-auto px-3 py-1 rounded bg-red-500 text-white
hover:bg-red-600\"

onClick={onRemove}

title=\"Delete emoji block\"

\>

Delete

\</button\>

\</div\>

\</div\>

);

}



## **6) JSON schema (one per block)**

> Use these as the **data** payload for each block envelope (e.g., { id,
> type, data, hidden }).\
> Your editor stores the **draft JSON**, and your backend renders
> **published HTML** from it (sanitized).

// TEXT

export type TextData = {

html: string; // rich text HTML (sanitized on publish)

};

// IMAGE

export type ImageData = {

url: string; // CDN public URL

alt?: string; // caption/title

};

// COLUMNS

export type ColumnsData = {

layout: \"1\" \| \"2-equal\" \| \"3-equal\" \| \"4-equal\" \|
\"5-equal\" \| \"6-equal\" \| \"7-equal\" \| \"8-equal\" \| \"2-33-66\"
\| \"2-66-33\";

cols: { id: string; items: BlockEnvelope\[\] }\[\]; // BlockEnvelope is
your editor\'s standard block wrapper

// NOTE: enforce cols.length \<= 8 in the editor when adding columns

};

// VIDEO

export type VideoData = {

url: string; // canonical or embeddable URL (backend can rewrite to
secure embed URL)

title?: string;

};

// EMOJI

export type EmojiData = {

emoji: string; // e.g., \"🚀\"

};

// Block envelope (example)

export type BlockEnvelope =

\| { id: string; type: \"text\"; data: TextData; hidden?: boolean }

\| { id: string; type: \"image\"; data: ImageData; hidden?: boolean }

\| { id: string; type: \"columns\"; data: ColumnsData; hidden?: boolean
}

\| { id: string; type: \"video\"; data: VideoData; hidden?: boolean }

\| { id: string; type: \"emoji\"; data: EmojiData; hidden?: boolean };



## **How this maps to your product rules**

- **Edit / Published states:** Every block accepts a mode: \"edit\" \|
  \"published\". The editor toggles this globally.

- **Delete on empty (Text):** Implemented in TextBlock via onRemove()
  when the contentEditable is emptied.

- **Max columns = 8:** Enforced by the editor when calling onAddColumn;
  the block UI also shows an "Add Column" affordance.

- **Move up/down, hide, duplicate, delete:** You control these at the
  editor level. The optional BlockActionBar shows how to expose buttons;
  wire them to your dnd-kit + state.

- **Video / Emoji "separate resources":** Blocks call
  onPick()/onChange() so you can integrate your existing
  pickers/services without changing the block code.

- **Dnd-kit compatibility:** Blocks are headless; no drag handles
  inside. Wrap block containers with SortableItem and columns with
  SortableContext in your editor layer.

**Each block supports all three states:**

- **Default state** (what shows the moment you insert it):

  - **TextBlock**: placeholder "Start typing..." (empty rich text).

  - **ImageBlock**: empty dropzone + Select/Replace controls.

  - **ColumnsBlock**: chosen layout with empty column slots ("Drag your
    fields here"); Add Column button (editor enforces max **8**).

  - **VideoBlock**: empty URL + optional title inputs.

  - **EmojiBlock**: default emoji preview (🙂) + "Pick/Change Emoji"
    button.

- **Edit state** (interactive authoring UI):

  - Passed via mode=\"edit\".

  - **TextBlock** uses contentEditable; **delete-on-empty** calls
    onRemove() automatically.

  - **ImageBlock** calls your onPick(file) → you return URL → it sets
    {url, alt} via onChange.

  - **ColumnsBlock** exposes layout chooser, Add Column, and per-column
    actions (move left/right, duplicate, delete). Parent editor renders
    column contents and enforces max 8.

  - **VideoBlock** takes a URL + optional title (you can rewrite to an
    embed URL on publish).

  - **EmojiBlock** calls your picker via onPick() and sets the chosen
    emoji.

- **Published state** (read-only client view):

  - Passed via mode=\"published\".

  - No edit chrome; **TextBlock** renders HTML (sanitize on server when
    publishing).

  - Image/Video/Emoji render static output.

  - Columns render as a responsive grid with whatever blocks you place
    inside.

### **How you toggle states**

Your editor decides the mode per page/selection and passes it in:

\<TextBlock mode=\"edit\" html=\"\" onChange={\...} onRemove={\...} /\>

\<TextBlock mode=\"published\" html={sanitizedHtml} onChange={() =\> {}}
onRemove={() =\> {}} /\>


