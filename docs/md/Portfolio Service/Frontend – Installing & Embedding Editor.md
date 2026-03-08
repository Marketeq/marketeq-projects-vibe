# **Frontend -- Installing & Embedding Editor.js**

Purpose: Guide the **frontend developer** through installing and
embedding **Editor.js** into the Next.js + Tailwind app. This provides
the editing core for the portfolio builder (used inside a modal),
without guesswork.

## **A. Install Dependencies**

In your Next.js project (apps/web-app):

npm install \@editorjs/editorjs \@editorjs/header \@editorjs/list
\@editorjs/image \@editorjs/paragraph

Optional tools (install as needed):

npm install \@editorjs/table \@editorjs/checklist \@editorjs/embed

These packages give you the **core editor** + basic blocks (header,
list, image, paragraph).

## **B. Create Editor Component**

**File:** components/portfolio-editor/EditorModal.tsx

import React, { useEffect, useRef } from \"react\";

import EditorJS from \"@editorjs/editorjs\";

import Header from \"@editorjs/header\";

import List from \"@editorjs/list\";

import ImageTool from \"@editorjs/image\";

import Paragraph from \"@editorjs/paragraph\";

import axios from \"axios\";

interface Props {

isOpen: boolean;

onClose: () =\> void;

itemSlug: string;

ownerUserId: string;

}

export default function EditorModal({ isOpen, onClose, itemSlug,
ownerUserId }: Props) {

const editorRef = useRef\<EditorJS \| null\>(null);

useEffect(() =\> {

if (!isOpen) return;

const editor = new EditorJS({

holder: \"editorjs\",

autofocus: true,

tools: {

header: Header,

list: List,

image: {

class: ImageTool,

config: {

uploader: {

async uploadByFile(file: File) {

const formData = new FormData();

formData.append(\"file\", file);

const res = await axios.post(\"/api/media/upload\", formData);

return { success: 1, file: { url: res.data.url } };

}

}

}

},

paragraph: Paragraph

},

onChange: async () =\> {

const data = await editor.save();

await axios.post(\"/portfolio/draft\", {

ownerUserId,

slug: itemSlug,

title: data.blocks?.\[0\]?.data?.text \|\| \"Untitled\",

schemaJson: data,

htmlDraft: document.getElementById(\"editor-preview\")?.innerHTML \|\|
\"\"

});

}

});

editorRef.current = editor;

return () =\> { editor.destroy(); editorRef.current = null; };

}, \[isOpen\]);

if (!isOpen) return null;

return (

\<div className=\"fixed inset-0 bg-black/60 flex items-center
justify-center z-50\"\>

\<div className=\"bg-white rounded-2xl w-full max-w-4xl p-6\"\>

\<div id=\"editorjs\" className=\"min-h-\[400px\]\" /\>

\<div id=\"editor-preview\" className=\"hidden\" /\>

\<div className=\"flex justify-end mt-4 gap-2\"\>

\<button onClick={onClose} className=\"px-4 py-2 rounded
bg-gray-200\"\>Close\</button\>

\<button

onClick={async () =\> {

await axios.post(\"/portfolio/publish\", { slug: itemSlug });

onClose();

}}

className=\"px-4 py-2 rounded bg-blue-600 text-white\"

\>Publish\</button\>

\</div\>

\</div\>

\</div\>

);

}



## **C. Add Modal to Dashboard Page**

**File:** pages/dashboard/portfolio/\[slug\].tsx

import { useState } from \"react\";

import EditorModal from
\"../../../components/portfolio-editor/EditorModal\";

export default function DashboardPortfolioPage({ slug, userId }: { slug:
string, userId: string }) {

const \[isOpen, setIsOpen\] = useState(false);

return (

\<div className=\"p-6\"\>

\<button

onClick={() =\> setIsOpen(true)}

className=\"px-4 py-2 bg-blue-600 text-white rounded\"

\>

Edit Portfolio

\</button\>

\<EditorModal

isOpen={isOpen}

onClose={() =\> setIsOpen(false)}

itemSlug={slug}

ownerUserId={userId}

/\>

\</div\>

);

}



## **D. Verify Editor Works**

1.  Start frontend dev server:

npm run dev

2.  Navigate to /dashboard/portfolio/\[slug\].

3.  Click **Edit Portfolio** → modal opens with Editor.js inside.

4.  Type text, add blocks (headers, lists, images).

5.  Confirm autosave hits backend /portfolio/draft.

6.  Press **Publish** to call /portfolio/publish.

## **E. Notes**

- Tailwind handles responsive rendering; authors only edit desktop.

- Add/remove Editor.js tools as needed. Each maps to JSON saved in
  Postgres.

- Extend block templates (see Block Templates doc) for rendering custom
  sections.
