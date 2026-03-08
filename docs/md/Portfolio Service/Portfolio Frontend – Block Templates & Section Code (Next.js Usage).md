# **Portfolio Frontend -- Block Templates & Section Code (Next.js Usage)**

This doc extends the block templates by showing how to **import and
render them inside Next.js pages** (e.g. pages/portfolio/\[slug\].tsx).
Everything works directly with Next.js + Tailwind, no extra CSS
framework required.

## **A. Setup**

1.  In your Next.js app (apps/web-app), ensure Tailwind is configured
    (already part of your stack).

2.  Copy all blocks into /components/portfolio-blocks/ (see previous
    doc).

3.  Create a **renderer** that maps JSON → components.

## **B. Renderer**

**File:** components/portfolio-view/PortfolioRenderer.tsx

import React from \"react\";

import IntroBlock from \"../portfolio-blocks/IntroBlock\";

import BoldStatementBlock from
\"../portfolio-blocks/BoldStatementBlock\";

import MetricsBlock from \"../portfolio-blocks/MetricsBlock\";

import Columns3Block from \"../portfolio-blocks/Columns3Block\";

import ProcessStepsBlock from \"../portfolio-blocks/ProcessStepsBlock\";

import PersonaBlock from \"../portfolio-blocks/PersonaBlock\";

import TestimonialsBlock from \"../portfolio-blocks/TestimonialsBlock\";

import ConclusionBlock from \"../portfolio-blocks/ConclusionBlock\";

export default function PortfolioRenderer({ blocks }: { blocks: any\[\]
}) {

return (

\<\>

{blocks.map((b, i) =\> {

switch (b.type) {

case \"intro\": return \<IntroBlock key={i} {\...b.data} /\>;

case \"boldStatement\": return \<BoldStatementBlock key={i} {\...b.data}
/\>;

case \"metrics\": return \<MetricsBlock key={i} {\...b.data} /\>;

case \"columns3\": return \<Columns3Block key={i} {\...b.data} /\>;

case \"process\": return \<ProcessStepsBlock key={i} {\...b.data} /\>;

case \"persona\": return \<PersonaBlock key={i} persona={b.data} /\>;

case \"testimonials\": return \<TestimonialsBlock key={i} {\...b.data}
/\>;

case \"conclusion\": return \<ConclusionBlock key={i} {\...b.data} /\>;

default: return null;

}

})}

\</\>

);

}



## **C. Next.js Page (Dynamic Route)**

**File:** pages/portfolio/\[slug\].tsx

import { GetServerSideProps } from \"next\";

import axios from \"axios\";

import PortfolioRenderer from
\"../../components/portfolio-view/PortfolioRenderer\";

export default function PortfolioPage({ blocks, title }: any) {

return (

\<main className=\"px-6 md:px-12 lg:px-24 py-12\"\>

\<h1 className=\"text-3xl md:text-5xl font-bold mb-8\"\>{title}\</h1\>

\<PortfolioRenderer blocks={blocks} /\>

\</main\>

);

}

export const getServerSideProps: GetServerSideProps = async (ctx) =\> {

const slug = ctx.params?.slug;

const res = await
axios.get(\`\${process.env.PORTFOLIO_API_URL}/portfolio/public/\${slug}\`);

const item = res.data;

return {

props: {

title: item.title,

blocks: item.schemaJson.blocks

}

};

};



## **D. Editor Integration (Modal in Dashboard)**

When a talent user edits their portfolio:

**File:** pages/dashboard/portfolio/\[slug\].tsx

import { useState } from \"react\";

import EditorModal from
\"../../../components/portfolio-editor/EditorModal\";

export default function DashboardPortfolioPage({ slug, userId }: { slug:
string, userId: string }) {

const \[isOpen, setIsOpen\] = useState(false);

return (

\<div className=\"p-6\"\>

\<button onClick={() =\> setIsOpen(true)} className=\"px-4 py-2
bg-blue-600 text-white rounded\"\>

Edit Portfolio

\</button\>

\<EditorModal isOpen={isOpen} onClose={() =\> setIsOpen(false)}
itemSlug={slug} ownerUserId={userId} /\>

\</div\>

);

}

This opens the **Editor.js modal**, allowing draft saves + publishing
directly from inside your dashboard.

## **E. Developer Flow**

1.  **Backend Dev**: Deploy portfolio-service. Ensure
    /portfolio/public/:slug returns { title, schemaJson }.

2.  **Frontend Dev**: Use getServerSideProps in \[slug\].tsx to fetch
    from backend, pass JSON blocks to PortfolioRenderer.

3.  **Editor Integration**: Add EditorModal to dashboard route, wired to
    backend /portfolio/draft and /portfolio/publish.

Now the frontend dev has:

- **Block components** (Intro, Bold Statement, Metrics, etc.).

- **Renderer** that maps JSON → React components.

- **Next.js pages** showing how to load data from backend + render.

- **Dashboard modal** for editing with Editor.js.

This ensures **no guesswork** and keeps everything in Next.js +
Tailwind.
