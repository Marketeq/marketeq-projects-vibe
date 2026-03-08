## **Where to find Editor.js**

- **Official site / docs**: editorjs.io --- overview, examples, API, how
  blocks (tools) work
  ([[editorjs.io]{.underline}](https://editorjs.io/?utm_source=chatgpt.com))

- **GitHub / code repo**: codex-team/editor.js
  ([[GitHub]{.underline}](https://github.com/codex-team/editorjs?utm_source=chatgpt.com))

- **NPM package**: \@editorjs/editorjs
  ([[npm]{.underline}](https://www.npmjs.com/package/%40editorjs/editorjs?activeTab=versions&utm_source=chatgpt.com))

## **How to install Editor.js in your Next.js / React frontend**

Here are the exact steps:

### **1. Install the core editor**

In your frontend project:

npm install \@editorjs/editorjs

\# or

yarn add \@editorjs/editorjs

This gives you the Editor.js core library.
([[editorjs.io]{.underline}](https://editorjs.io/getting-started/?utm_source=chatgpt.com))

### **2. Pick & install "tools" (blocks) you want**

Editor.js runs with **tools/plugins** for different block types. Some
common ones:

- \@editorjs/header --- for headings

- \@editorjs/list --- for lists

- \@editorjs/image --- for images

- \@editorjs/paragraph --- basic paragraph text

- Others like \@editorjs/raw, \@editorjs/checklist, etc.
  ([[editorjs.io]{.underline}](https://editorjs.io/getting-started/?utm_source=chatgpt.com))

So you'd also run, for example:

npm install \@editorjs/header \@editorjs/list \@editorjs/image
\@editorjs/paragraph

### **3. Initialize Editor.js in your component**

In a React / Next.js component, you do something like:

import EditorJS from \"@editorjs/editorjs\";

import Header from \"@editorjs/header\";

import List from \"@editorjs/list\";

import ImageTool from \"@editorjs/image\";

import Paragraph from \"@editorjs/paragraph\";

function MyEditor() {

const editorRef = useRef\<EditorJS \| null\>(null);

useEffect(() =\> {

const editor = new EditorJS({

holder: \"editorjs\", // ID or DOM element where editor mounts

tools: {

header: Header,

list: List,

image: {

class: ImageTool,

config: {

uploader: {

uploadByFile(file: File) {

// your upload logic returns { success, file: { url } }

}

}

}

},

paragraph: Paragraph

},

onChange: async () =\> {

const data = await editor.save();

console.log(\"Saved JSON:\", data);

}

});

editorRef.current = editor;

return () =\> {

editor.destroy();

editorRef.current = null;

};

}, \[\]);

return \<div id=\"editorjs\" className=\"min-h-\[300px\]\" /\>;

}

This shows you where to mount it (holder: \"editorjs\") and how to pass
the tools. The onChange calls editor.save() which returns the JSON
structure.
