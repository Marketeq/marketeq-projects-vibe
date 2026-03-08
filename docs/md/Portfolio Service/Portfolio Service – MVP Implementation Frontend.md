# **Portfolio Service -- MVP Implementation Frontend**

Goal: Deliver a **portfolio/case‑study builder** matching the Edit Mode
& Client View designs. Frontend (Next.js + Tailwind) handles the editor
modal + responsive rendering. Backend (NestJS + Postgres, Dockerized for
Render) manages storage, autosave, publishing, and sanitization.
Everything is copy‑pasteable, with no guesswork.

## **Part A -- Frontend (Next.js + Tailwind)**

### **1. Install Dependencies**

****cd apps/web-app

npm i \@editorjs/editorjs \@editorjs/header \@editorjs/list
\@editorjs/image \@editorjs/table \@editorjs/paragraph

npm i react-use nanoid axios

### **2. Editor Modal Component**

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

const htmlDraft = document.getElementById(\"preview-area\")?.innerHTML
\|\| \"\";

await axios.post(\"/portfolio/draft\", {

ownerUserId,

slug: itemSlug,

title: data.blocks?.\[0\]?.data?.text \|\| \"Untitled\",

schemaJson: data,

htmlDraft

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

\<div id=\"preview-area\" className=\"hidden\"\>\</div\>

\<div className=\"flex justify-end mt-4 gap-2\"\>

\<button onClick={onClose} className=\"px-4 py-2 rounded
bg-gray-200\"\>Close\</button\>

\<button

onClick={async () =\> {

const res = await axios.post(\"/portfolio/publish\", { slug: itemSlug
});

console.log(\"Published:\", res.data);

onClose();

}}

className=\"px-4 py-2 rounded bg-blue-600 text-white\"

\>

Publish

\</button\>

\</div\>

\</div\>

\</div\>

);

}

### **3. Renderer (Client View)**

**File:** components/portfolio-view/PortfolioRenderer.tsx

import React from \"react\";

interface Props { html: string }

export default function PortfolioRenderer({ html }: Props) {

return (

\<div className=\"prose max-w-none\" dangerouslySetInnerHTML={{
\_\_html: html }} /\>

);

}

### **4. Tailwind Responsiveness**

- Columns: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

- Metrics: grid grid-cols-2 sm:grid-cols-4 gap-4

- Images: w-full h-auto rounded-xl object-cover

- Typography: prose prose-slate

Authors edit once; CSS breakpoints handle tablet/mobile automatically.
