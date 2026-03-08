# **04 - Strapi Lifecycle & Next.js Category Pages -- Developer Integration Guide**

## **1. Purpose**

This document provides the **complete implementation** for:

- Strapi category & tag lifecycle hooks for syncing with NestJS.

- Webhook configuration for real-time updates.

- Next.js recursive category page rendering for unlimited nesting.

- Dynamic SEO template integration for category pages.

## **2. Strapi Lifecycle Hooks**

### **a. Category Hooks**

Create a lifecycle file in Strapi:

/strapi/src/api/category/content-types/category/lifecycles.js

const axios = require(\'axios\');

module.exports = {

async afterCreate(event) {

const category = event.result;

await axios.post(\`\${process.env.NEST_API}/categories/sync\`, category,
{

headers: { Authorization: \`Bearer \${process.env.NEST_TOKEN}\` }

});

},

async afterUpdate(event) {

const category = event.result;

await axios.post(\`\${process.env.NEST_API}/categories/sync\`, category,
{

headers: { Authorization: \`Bearer \${process.env.NEST_TOKEN}\` }

});

},

async afterDelete(event) {

const category = event.params.where;

await
axios.delete(\`\${process.env.NEST_API}/categories/\${category.uuid}\`,
{

headers: { Authorization: \`Bearer \${process.env.NEST_TOKEN}\` }

});

}

};



### **b. Tag Hooks**

/strapi/src/api/tag/content-types/tag/lifecycles.js

const axios = require(\'axios\');

module.exports = {

async afterCreate(event) {

const tag = event.result;

await axios.post(\`\${process.env.NEST_API}/tags/sync\`, tag, {

headers: { Authorization: \`Bearer \${process.env.NEST_TOKEN}\` }

});

},

async afterUpdate(event) {

const tag = event.result;

await axios.post(\`\${process.env.NEST_API}/tags/sync\`, tag, {

headers: { Authorization: \`Bearer \${process.env.NEST_TOKEN}\` }

});

}

};



## **3. Strapi Webhook Configuration**

If you prefer webhooks over lifecycles, configure:

- **URL:** https://nest.api/categories/sync

- **Events:** Category Create, Update, Delete

- **Payload:** Include relations (parent UUID, tags)

Webhook JSON example:

{

\"uuid\": \"123-abc\",

\"name\": \"AI & Machine Learning\",

\"slug\": \"ai-machine-learning\",

\"parent\": \"dev-uuid\",

\"tags\": \[\"ml\", \"ai\"\],

\"approved\": true,

\"published_in_marketplace\": false

}



## **4. Next.js Category Pages**

### **a. Dynamic Routes**

Create a dynamic page:

/pages/categories/\[slug\].tsx

import { GetServerSideProps } from \'next\';

import Head from \'next/head\';

import { getCategoryData } from \'@/lib/categories\';

export default function CategoryPage({ category }) {

const title = category.seo_meta_title \|\| \`Browse \${category.name}
Projects & Talent\`;

const description = category.seo_meta_description \|\| \`Find top
services, teams, and jobs in \${category.name}.\`;

return (

\<\>

\<Head\>

\<title\>{title}\</title\>

\<meta name=\"description\" content={description} /\>

\</Head\>

\<h1\>{category.name}\</h1\>

{category.children && category.children.length \> 0 && (

\<ul\>

{category.children.map(child =\> (

\<li key={child.uuid}\>

\<a href={\`/categories/\${child.slug}\`}\>{child.name}\</a\>

\</li\>

))}

\</ul\>

)}

\</\>

);

}

export const getServerSideProps: GetServerSideProps = async ({ params })
=\> {

const category = await getCategoryData(params.slug as string);

return { props: { category } };

};



### **b. Recursive Category Fetch**

/lib/categories.ts

export async function getCategoryData(slug: string) {

const res = await
fetch(\`\${process.env.NEST_API}/categories/\${slug}\`);

const category = await res.json();

// Recursively fetch children if needed

const fetchChildren = async (cat) =\> {

const children = await Promise.all(

cat.children.map(async (child) =\> {

const childData = await getCategoryData(child.slug);

return { \...child, children: childData.children \|\| \[\] };

})

);

return children;

};

category.children = await fetchChildren(category);

return category;

}



## **5. Dynamic SEO Integration**

- Default SEO comes from dynamic template using category.name.

- Optional overrides use seo_meta_title and seo_meta_description.

- All new subcategories automatically get SEO via template.

## **6. Testing Checklist**

- ✅ Creating/updating categories in Strapi fires NestJS sync via
  lifecycle or webhook.

- ✅ Deleting categories triggers safe deletion in NestJS.

- ✅ Tags sync properly between systems.

- ✅ Next.js renders unlimited nesting correctly.

- ✅ Dynamic SEO defaults apply automatically.

- ✅ Optional SEO overrides are respected.
