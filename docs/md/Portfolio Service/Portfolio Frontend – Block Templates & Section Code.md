# **Portfolio Frontend -- Block Templates & Section Code**

Purpose: Provide the **frontend developer** with copy‑pasteable React +
Tailwind components for each portfolio section (Intro, Bold Statement,
Metrics, Columns, Personas, Testimonials, Conclusion, etc.), plus exact
usage instructions. This doc is separate from backend instructions.

## **A. Setup**

1.  Navigate to your Next.js frontend project root (apps/web-app).

2.  Ensure Tailwind is already configured (per your stack).

3.  Create folder for blocks:

/components/portfolio-blocks/

4.  \
    Each block below is a **standalone React component**. Copy the code
    into files with matching names.

## **B. Block Components**

### **1. Intro Block**

**File:** components/portfolio-blocks/IntroBlock.tsx

import React from \"react\";

interface IntroProps {

eyebrow?: string;

title: string;

intro: string;

}

export default function IntroBlock({ eyebrow, title, intro }:
IntroProps) {

return (

\<section className=\"py-12\"\>

{eyebrow && \<p className=\"text-sm uppercase tracking-wide
text-blue-600\"\>{eyebrow}\</p\>}

\<h1 className=\"text-3xl md:text-5xl font-bold mt-2\"\>{title}\</h1\>

\<p className=\"mt-4 text-lg text-gray-600 max-w-3xl\"\>{intro}\</p\>

\</section\>

);

}

### **2. Bold Statement Block**

**File:** components/portfolio-blocks/BoldStatementBlock.tsx

import React from \"react\";

export default function BoldStatementBlock({ text }: { text: string }) {

return (

\<section className=\"py-12 bg-gray-50\"\>

\<blockquote className=\"text-2xl md:text-4xl font-semibold text-center
max-w-4xl mx-auto\"\>

{text}

\</blockquote\>

\</section\>

);

}

### **3. Metrics Block**

**File:** components/portfolio-blocks/MetricsBlock.tsx

import React from \"react\";

interface Metric { label: string; value: string }

export default function MetricsBlock({ items }: { items: Metric\[\] }) {

return (

\<section className=\"py-12\"\>

\<div className=\"grid grid-cols-2 sm:grid-cols-4 gap-6 text-center\"\>

{items.map((m, i) =\> (

\<div key={i}\>

\<p className=\"text-3xl md:text-4xl font-bold
text-blue-600\"\>{m.value}\</p\>

\<p className=\"mt-2 text-sm text-gray-600\"\>{m.label}\</p\>

\</div\>

))}

\</div\>

\</section\>

);

}

### **4. Columns (3‑col)**

**File:** components/portfolio-blocks/Columns3Block.tsx

import React from \"react\";

interface Col { title: string; body: string }

export default function Columns3Block({ cols }: { cols: Col\[\] }) {

return (

\<section className=\"py-12\"\>

\<div className=\"grid grid-cols-1 md:grid-cols-3 gap-8\"\>

{cols.map((c, i) =\> (

\<div key={i} className=\"bg-white rounded-xl shadow p-6\"\>

\<h3 className=\"text-xl font-semibold\"\>{c.title}\</h3\>

\<p className=\"mt-2 text-gray-600\"\>{c.body}\</p\>

\</div\>

))}

\</div\>

\</section\>

);

}

### **5. Process Steps**

**File:** components/portfolio-blocks/ProcessStepsBlock.tsx

import React from \"react\";

interface Step { title: string; body: string }

export default function ProcessStepsBlock({ steps }: { steps: Step\[\]
}) {

return (

\<section className=\"py-12\"\>

\<ol className=\"grid grid-cols-1 md:grid-cols-4 gap-6\"\>

{steps.map((s, i) =\> (

\<li key={i} className=\"bg-gray-50 rounded-xl p-6 text-center\"\>

\<span className=\"inline-block w-10 h-10 rounded-full bg-blue-600
text-white font-bold mb-3\"\>{i+1}\</span\>

\<h4 className=\"font-semibold text-lg\"\>{s.title}\</h4\>

\<p className=\"mt-2 text-gray-600 text-sm\"\>{s.body}\</p\>

\</li\>

))}

\</ol\>

\</section\>

);

}

### **6. Persona Block**

**File:** components/portfolio-blocks/PersonaBlock.tsx

import React from \"react\";

interface Persona {

name: string;

age: number;

title: string;

traits: string\[\];

about: string;

}

export default function PersonaBlock({ persona }: { persona: Persona })
{

return (

\<section className=\"py-12\"\>

\<div className=\"max-w-3xl mx-auto bg-white rounded-xl shadow p-6\"\>

\<h3 className=\"text-2xl font-bold\"\>{persona.name},
{persona.age}\</h3\>

\<p className=\"text-blue-600 font-medium\"\>{persona.title}\</p\>

\<p className=\"mt-3 text-gray-600\"\>{persona.about}\</p\>

\<ul className=\"mt-4 flex flex-wrap gap-2\"\>

{persona.traits.map((t, i) =\> (

\<li key={i} className=\"bg-gray-100 px-3 py-1 rounded-full
text-sm\"\>{t}\</li\>

))}

\</ul\>

\</div\>

\</section\>

);

}

### **7. Testimonials Block**

**File:** components/portfolio-blocks/TestimonialsBlock.tsx

import React from \"react\";

interface Testimonial { quote: string; author: string; role: string }

export default function TestimonialsBlock({ items }: { items:
Testimonial\[\] }) {

return (

\<section className=\"py-12 bg-gray-50\"\>

\<div className=\"grid gap-6 md:grid-cols-2\"\>

{items.map((t, i) =\> (

\<div key={i} className=\"bg-white shadow rounded-xl p-6\"\>

\<p className=\"italic text-gray-800\"\>"{t.quote}"\</p\>

\<p className=\"mt-3 font-semibold\"\>{t.author}\</p\>

\<p className=\"text-sm text-gray-500\"\>{t.role}\</p\>

\</div\>

))}

\</div\>

\</section\>

);

}

### **8. Conclusion Block**

**File:** components/portfolio-blocks/ConclusionBlock.tsx

import React from \"react\";

export default function ConclusionBlock({ body }: { body: string }) {

return (

\<section className=\"py-12\"\>

\<p className=\"text-lg text-gray-700 max-w-3xl mx-auto\"\>{body}\</p\>

\</section\>

);

}



## **C. Usage Instructions**

1.  Import blocks into your renderer:

import IntroBlock from \"../portfolio-blocks/IntroBlock\";

import BoldStatementBlock from
\"../portfolio-blocks/BoldStatementBlock\";

import MetricsBlock from \"../portfolio-blocks/MetricsBlock\";

import Columns3Block from \"../portfolio-blocks/Columns3Block\";

import ProcessStepsBlock from \"../portfolio-blocks/ProcessStepsBlock\";

import PersonaBlock from \"../portfolio-blocks/PersonaBlock\";

import TestimonialsBlock from \"../portfolio-blocks/TestimonialsBlock\";

import ConclusionBlock from \"../portfolio-blocks/ConclusionBlock\";

2.  Map JSON schema → block component:

function RenderPortfolio({ blocks }: { blocks: any\[\] }) {

return (

\<\>

{blocks.map((b, i) =\> {

switch(b.type) {

case \"intro\": return \<IntroBlock key={i} {\...b.data} /\>

case \"boldStatement\": return \<BoldStatementBlock key={i} {\...b.data}
/\>

case \"metrics\": return \<MetricsBlock key={i} {\...b.data} /\>

case \"columns3\": return \<Columns3Block key={i} {\...b.data} /\>

case \"process\": return \<ProcessStepsBlock key={i} {\...b.data} /\>

case \"persona\": return \<PersonaBlock key={i} persona={b.data} /\>

case \"testimonials\": return \<TestimonialsBlock key={i} {\...b.data}
/\>

case \"conclusion\": return \<ConclusionBlock key={i} {\...b.data} /\>

default: return null;

}

})}

\</\>

);

}

3.  \
    Ensure each block's b.data shape matches what the editor saves.

## **D. Responsiveness**

- Every block uses Tailwind sm:, md:, lg: classes.

- Authors edit once for desktop. Tablet/mobile are auto‑responsive.

This document provides the **block templates** and **renderer wiring**
needed for the frontend developer to implement the portfolio sections
exactly as designed, without guesswork.
