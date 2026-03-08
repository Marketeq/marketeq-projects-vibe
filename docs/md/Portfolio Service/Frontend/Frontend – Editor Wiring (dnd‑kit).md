# **Frontend -- Editor Wiring (dnd‑kit)**

Goal: show how to connect the headless **Blocks** to a sortable editor
using **dnd‑kit**. Includes: move up/down, duplicate, delete, hide, and
saving JSON to your backend. This doc only covers wiring -- it reuses
the React blocks you already have.

## **0) Install**

****npm i \@dnd-kit/core \@dnd-kit/sortable \@dnd-kit/modifiers nanoid



## **1) Data model (document + envelopes)**

**File:** types/document.ts

import type { ColumnsData, EmojiData, ImageData, TextData, VideoData }
from \"./schemas\";

export type BlockType = \"text\" \| \"image\" \| \"columns\" \|
\"video\" \| \"emoji\" \| \"prototype\";

// Envelope for any block (we add id + hidden + type)

export type BlockEnvelope =

\| { id: string; type: \"text\"; data: TextData; hidden?: boolean }

\| { id: string; type: \"image\"; data: ImageData; hidden?: boolean }

\| { id: string; type: \"columns\"; data: ColumnsData; hidden?: boolean
}

\| { id: string; type: \"video\"; data: VideoData; hidden?: boolean }

\| { id: string; type: \"emoji\"; data: EmojiData; hidden?: boolean }

\| { id: string; type: \"prototype\"; data: { provider:
\"figma\"\|\"framer\"; url: string; titleHtml?: string }; hidden?:
boolean };

export type Section = { id: string; type: string; data: any; hidden?:
boolean };

export type PortfolioDoc = {

title: string;

// keep it simple: flat list of blocks for the page (you can also group
by sections)

blocks: BlockEnvelope\[\];

};



## **2) Sortable wrapper components**

**File:** components/dnd/SortableItem.tsx

import React from \"react\";

import { useSortable } from \"@dnd-kit/sortable\";

import { CSS } from \"@dnd-kit/utilities\";

// Wrap any block to make it draggable/sortable in its parent
list/column.

export default function SortableItem({ id, children }: { id: string;
children: React.ReactNode }) {

const { attributes, listeners, setNodeRef, transform, transition,
isDragging } = useSortable({ id });

const style: React.CSSProperties = { transform:
CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5
: 1 };

return (

\<div ref={setNodeRef} style={style} {\...attributes} {\...listeners}\>

{children}

\</div\>

);

}



## **3) Utilities (move, duplicate, deep‑clone, toggle, delete)**

**File:** lib/editorOps.ts

export function arrayMove\<T\>(arr: T\[\], from: number, to: number) {

const next = arr.slice();

const \[it\] = next.splice(from, 1);

next.splice(to, 0, it);

return next;

}

export function deepClone\<T\>(v: T): T { return
JSON.parse(JSON.stringify(v)); }

export function duplicateAt\<T\>(arr: T\[\], index: number): T\[\] {

const next = arr.slice();

next.splice(index + 1, 0, deepClone(arr\[index\]));

return next;

}

export function removeAt\<T\>(arr: T\[\], index: number): T\[\] {

const next = arr.slice(); next.splice(index, 1); return next;

}

export function toggleHidden\<T extends { hidden?: boolean }\>(item: T):
T {

return { \...item, hidden: !item.hidden };

}



## **4) Editor page skeleton (page‑level drag + save JSON)**

**File:** pages/dashboard/portfolio/\[slug\].tsx

import React, { useMemo, useState } from \"react\";

import { nanoid } from \"nanoid\";

import axios from \"axios\";

import { DndContext, closestCenter, DragEndEvent, MouseSensor,
TouchSensor, useSensor, useSensors } from \"@dnd-kit/core\";

import { SortableContext, rectSortingStrategy } from
\"@dnd-kit/sortable\";

import SortableItem from \"@/components/dnd/SortableItem\";

import TextBlock from \"@/components/blocks/TextBlock\";

import ImageBlock from \"@/components/blocks/ImageBlock\";

import ColumnsBlock from \"@/components/blocks/ColumnsBlock\";

import VideoBlock from \"@/components/blocks/VideoBlock\";

import EmojiBlock from \"@/components/blocks/EmojiBlock\";

import PrototypeBlock from \"@/components/blocks/PrototypeBlock\";

import { arrayMove, duplicateAt, removeAt, toggleHidden } from
\"@/lib/editorOps\";

import type { BlockEnvelope, PortfolioDoc } from \"@/types/document\";

export default function PortfolioEditorPage() {

const sensors = useSensors(useSensor(MouseSensor),
useSensor(TouchSensor));

// Start with an empty page (add your own loader to fetch drafts by
slug)

const \[doc, setDoc\] = useState\<PortfolioDoc\>({ title: \"Untitled
Case Study\", blocks: \[\] });

// Palette helpers

function addText() { setDoc((d) =\> ({ \...d, blocks: \[\...d.blocks, {
id: nanoid(), type: \"text\", data: { html: \"\" } }\] })); }

function addImage() { setDoc((d) =\> ({ \...d, blocks: \[\...d.blocks, {
id: nanoid(), type: \"image\", data: { url: \"\", alt: \"\" } }\] })); }

function addEmoji() { setDoc((d) =\> ({ \...d, blocks: \[\...d.blocks, {
id: nanoid(), type: \"emoji\", data: { emoji: \"🚀\" } }\] })); }

function addVideo() { setDoc((d) =\> ({ \...d, blocks: \[\...d.blocks, {
id: nanoid(), type: \"video\", data: { url: \"\", titleHtml: \"\" } as
any }\] })); }

function addPrototype() { setDoc((d) =\> ({ \...d, blocks:
\[\...d.blocks, { id: nanoid(), type: \"prototype\", data: { provider:
\"figma\", url: \"\" } }\] })); }

function addColumns() {

// 2-equal by default; max 4 columns is enforced \*inside\* the Columns
block UI

setDoc((d) =\> ({

\...d,

blocks: \[

\...d.blocks,

{ id: nanoid(), type: \"columns\", data: { layout: \"2-equal\", cols: \[
{ id: nanoid(), items: \[\] }, { id: nanoid(), items: \[\] } \] } as any
},

\],

}));

}

// Move blocks at the top level (page order)

function moveBlock(id: string, dir: -1 \| 1) {

setDoc((d) =\> {

const i = d.blocks.findIndex((b) =\> b.id === id);

if (i \< 0) return d;

const to = i + dir;

if (to \< 0 \|\| to \>= d.blocks.length) return d;

return { \...d, blocks: arrayMove(d.blocks, i, to) };

});

}

// Duplicate / Delete / Hide

function duplicateBlock(id: string) {

setDoc((d) =\> {

const i = d.blocks.findIndex((b) =\> b.id === id);

if (i \< 0) return d;

const copy = JSON.parse(JSON.stringify(d.blocks\[i\])) as BlockEnvelope;

copy.id = nanoid();

return { \...d, blocks: duplicateAt(d.blocks, i).map((b, idx) =\> (idx
=== i + 1 ? copy : b)) };

});

}

function deleteBlock(id: string) { setDoc((d) =\> ({ \...d, blocks:
d.blocks.filter((b) =\> b.id !== id) })); }

function toggleHide(id: string) { setDoc((d) =\> ({ \...d, blocks:
d.blocks.map((b) =\> (b.id === id ? toggleHidden(b) : b)) })); }

// dnd-kit: reorder top-level blocks by dragging

function onDragEnd(e: DragEndEvent) {

const { active, over } = e;

if (!over \|\| active.id === over.id) return;

setDoc((d) =\> {

const from = d.blocks.findIndex((b) =\> b.id === active.id);

const to = d.blocks.findIndex((b) =\> b.id === over.id);

if (from \< 0 \|\| to \< 0) return d;

return { \...d, blocks: arrayMove(d.blocks, from, to) };

});

}

// Save draft JSON to backend; on publish, backend renders HTML from
JSON

async function saveDraft() {

await axios.post(\"/portfolio/draft\", {

ownerUserId: \"\<owner\>\",

slug: \"\<slug\>\",

title: doc.title,

schemaJson: doc,

htmlDraft: \"\", // backend server-renders at publish time

});

}

async function publish() { await axios.post(\"/portfolio/publish\", {
slug: \"\<slug\>\" }); }

// Helper passed into blocks to sanitize deletion when text becomes
empty

function onRemoveById(id: string) { deleteBlock(id); }

return (

\<main className=\"p-6 space-y-4\"\>

{/\* Header \*/}

\<header className=\"flex items-center justify-between gap-3\"\>

\<input className=\"text-2xl md:text-3xl font-bold outline-none\"
value={doc.title} onChange={(e) =\> setDoc({ \...doc, title:
e.target.value })} /\>

\<div className=\"flex gap-2\"\>

\<button className=\"px-3 py-2 rounded bg-gray-100\"
onClick={saveDraft}\>Save\</button\>

\<button className=\"px-3 py-2 rounded bg-blue-600 text-white\"
onClick={publish}\>Publish\</button\>

\</div\>

\</header\>

{/\* Simple palette \*/}

\<div className=\"flex flex-wrap gap-2\"\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addText}\>+ Text\</button\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addImage}\>+ Image\</button\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addColumns}\>+ Columns\</button\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addVideo}\>+ Video\</button\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addEmoji}\>+ Emoji\</button\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addPrototype}\>+ Prototype\</button\>

\</div\>

{/\* Sortable page-level list of blocks \*/}

\<DndContext sensors={sensors} collisionDetection={closestCenter}
onDragEnd={onDragEnd}\>

\<SortableContext items={doc.blocks.map((b) =\> b.id)}
strategy={rectSortingStrategy}\>

\<div className=\"space-y-6\"\>

{doc.blocks.map((b, i) =\> (

\<SortableItem id={b.id} key={b.id}\>

{renderBlock(b)}

\</SortableItem\>

))}

\</div\>

\</SortableContext\>

\</DndContext\>

\</main\>

);

// Render a block by type in EDIT mode

function renderBlock(b: BlockEnvelope) {

const actions = {

onMoveUp: () =\> moveBlock(b.id, -1),

onMoveDown: () =\> moveBlock(b.id, +1),

onDuplicate: () =\> duplicateBlock(b.id),

onDelete: () =\> deleteBlock(b.id),

onToggleHidden: () =\> toggleHide(b.id),

hidden: !!b.hidden,

};

if (b.type === \"text\") {

return (

\<TextBlock

mode=\"edit\"

html={b.data.html}

onChange={(html) =\> setDoc((d) =\> ({ \...d, blocks: d.blocks.map((x)
=\> (x.id === b.id ? { \...x, data: { \...x.data, html } } : x)) }))}

onRemove={() =\> onRemoveById(b.id)}

actions={actions}

/\>

);

}

if (b.type === \"image\") {

return (

\<ImageBlock

mode=\"edit\"

url={b.data.url}

alt={b.data.alt}

onPick={async (file) =\> {

// proxy to your media service

const form = new FormData(); form.append(\"file\", file);

const res = await fetch(\"/api/media/upload\", { method: \"POST\", body:
form });

const { url } = await res.json();

return url as string;

}}

onChange={(next) =\> setDoc((d) =\> ({ \...d, blocks: d.blocks.map((x)
=\> (x.id === b.id ? { \...x, data: { \...x.data, \...next } } : x))
}))}

onRemove={() =\> onRemoveById(b.id)}

actions={actions}

/\>

);

}

if (b.type === \"emoji\") {

return (

\<EmojiBlock

mode=\"edit\"

emoji={b.data.emoji}

onPick={async () =\> \"🚀\"} // plug your picker here

onChange={(next) =\> setDoc((d) =\> ({ \...d, blocks: d.blocks.map((x)
=\> (x.id === b.id ? { \...x, data: { \...x.data, \...next } } : x))
}))}

onRemove={() =\> onRemoveById(b.id)}

actions={actions}

/\>

);

}

if (b.type === \"video\") {

return (

\<VideoBlock

mode=\"edit\"

url={b.data.url}

title={(b.data as any).title}

onChange={(next) =\> setDoc((d) =\> ({ \...d, blocks: d.blocks.map((x)
=\> (x.id === b.id ? { \...x, data: { \...x.data, \...next } } : x))
}))}

onRemove={() =\> onRemoveById(b.id)}

actions={actions}

/\>

);

}

if (b.type === \"prototype\") {

return (

\<PrototypeBlock

mode=\"edit\"

provider={b.data.provider}

url={b.data.url}

title={(b.data as any).titleHtml}

onChange={(next) =\> setDoc((d) =\> ({ \...d, blocks: d.blocks.map((x)
=\> (x.id === b.id ? { \...x, data: { \...x.data, \...next } } : x))
}))}

onRemove={() =\> onRemoveById(b.id)}

actions={actions}

/\>

);

}

if (b.type === \"columns\") {

// Columns content is managed INSIDE data.cols\[\].items (each item is a
BlockEnvelope).

// dnd-kit is used INSIDE each column to sort items.

const data = b.data as any;

return (

\<ColumnsBlock

mode=\"edit\"

layout={data.layout}

columns={data.cols.map((c: any) =\> ({ id: c.id, span: c.span ?? 6 }))}

onChangeLayout={(next) =\> setDoc((d) =\> ({ \...d, blocks:
d.blocks.map((x) =\> (x.id === b.id ? { \...x, data: { \...data, layout:
next } } : x)) }))}

onAddColumn={() =\> setDoc((d) =\> {

// enforce max 4 columns

const cols = data.cols as any\[\];

if (cols.length \>= 4) return d;

const newCol = { id: nanoid(), span: Math.max(3, Math.floor(12 /
(cols.length + 1))), items: \[\] };

const next = { \...data, cols: \[\...cols, newCol\] };

return { \...d, blocks: d.blocks.map((x) =\> (x.id === b.id ? { \...x,
data: next } : x)) };

})}

onUpdateColumns={(nextCols) =\> setDoc((d) =\> ({

\...d,

blocks: d.blocks.map((x) =\> (x.id === b.id ? { \...x, data: { \...data,
cols: data.cols.map((c: any) =\> nextCols.find((n: any) =\> n.id ===
c.id) ?? c).map((c: any) =\> ({ \...c, span: (nextCols.find((n: any) =\>
n.id === c.id)?.span) ?? c.span })) } : x))

}))}

onDeleteColumn={(colId) =\> setDoc((d) =\> ({

\...d,

blocks: d.blocks.map((x) =\> (x.id === b.id ? { \...x, data: { \...data,
cols: data.cols.filter((c: any) =\> c.id !== colId) } } : x))

}))}

renderColumn={(colId) =\> \<ColumnContent blockId={b.id} colId={colId}
/\>}

actions={actions}

/\>

);

}

return null;

}

// Renders the inside of a single column using its own SortableContext

function ColumnContent({ blockId, colId }: { blockId: string; colId:
string }) {

const data = (doc.blocks.find((b) =\> b.id === blockId)!.data as any);

const col = data.cols.find((c: any) =\> c.id === colId);

const items = col.items as BlockEnvelope\[\];

function setItems(next: BlockEnvelope\[\]) {

setDoc((d) =\> ({

\...d,

blocks: d.blocks.map((b) =\> (b.id === blockId ? { \...b, data: {
\...data, cols: data.cols.map((c: any) =\> (c.id === colId ? { \...c,
items: next } : c)) } } : b)),

}));

}

function onDragEndColumn(e: DragEndEvent) {

const { active, over } = e; if (!over \|\| active.id === over.id)
return;

const from = items.findIndex((it) =\> it.id === active.id);

const to = items.findIndex((it) =\> it.id === over.id);

if (from \< 0 \|\| to \< 0) return;

setItems(arrayMove(items, from, to));

}

function addText() { setItems(\[\...items, { id: nanoid(), type:
\"text\", data: { html: \"\" } } as BlockEnvelope\]); }

return (

\<DndContext sensors={sensors} collisionDetection={closestCenter}
onDragEnd={onDragEndColumn}\>

\<div className=\"mb-2\"\>

\<button className=\"px-2 py-1 rounded bg-gray-100\"
onClick={addText}\>+ Text\</button\>

\</div\>

\<SortableContext items={items.map((it) =\> it.id)}
strategy={rectSortingStrategy}\>

\<div className=\"space-y-3\"\>

{items.map((it) =\> (

\<SortableItem id={it.id} key={it.id}\>

{/\* You can reuse renderBlock for inner items, but be careful to scope
updates to column \*/}

\<TextBlock

mode=\"edit\"

html={(it as any).data.html}

onChange={(html) =\> setItems(items.map((x) =\> (x.id === it.id ? ({
\...x, data: { \...x.data, html } }) : x)))}

onRemove={() =\> setItems(items.filter((x) =\> x.id !== it.id))}

/\>

\</SortableItem\>

))}

\</div\>

\</SortableContext\>

\</DndContext\>

);

}

}



## **5) Notes**

- **Move up/down** uses arrayMove on the page's blocks array. Same idea
  inside columns.

- **Duplicate/Delete/Hide** are simple array operations on the
  envelopes.

- **Columns (max 4)** is enforced by disabling the add/duplicate buttons
  and by checks in the editor callbacks.

- **Save JSON**: saveDraft() sends the full doc to your backend; publish
  generates sanitized HTML server‑side.

- **Preview**: to preview like "Published," render blocks with
  mode=\"published\" and hide the action bars.
