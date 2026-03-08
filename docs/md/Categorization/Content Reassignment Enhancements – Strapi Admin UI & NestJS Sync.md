**Content Reassignment Enhancements -- Strapi Admin UI & NestJS Sync**

This doc will **not** rewrite any existing reassignment or deletion
code.\
It'll **extend** what we already finalized by adding **UI fixes + NestJS
sync improvements** based on the plugin work and admin constraints.

## **Scope**

This doc focuses on improving the **Strapi admin experience** for
content/category reassignment when deleting parent categories, ensuring
data integrity in both Strapi and NestJS while avoiding any automatic
deletions of child categories.

## **Objectives**

1.  **Force Manual Reassignment** → Prevent orphaned child categories.

2.  **Enhance Admin UI Workflow** → Provide an intuitive way for admins
    to select a new parent.

3.  **Improve NestJS Sync** → Ensure updates propagate automatically to
    NestJS.

4.  **Add Safety Nets** → No automatic deletions, ever. Explicit
    reassignment is required.

## **Step 1 --- Admin UI Changes**

We\'ll enhance the Strapi **content reassignment plugin** so that:

- When an **admin attempts to delete a parent category**, a **modal**
  appears:

  - Shows all child categories.

  - **Forces the admin to choose** a new parent **before deletion is
    allowed**.

  - If no parent is selected → Deletion is **blocked**.

- **Top-level categories**:

  - If you leave children without a parent, the system will **force
    you** to assign them somewhere else.

  - This keeps the marketplace hierarchy clean.

### **New UI Flow**

**Trigger:** Admin clicks "Delete" on a parent category.

**Steps:**

1.  Modal opens → "This category has X children."

2.  Child categories are displayed in a **selectable list**.

3.  A dropdown is shown:

    - "Select a new parent category."

    - Includes:

      - All other valid parent categories.

      - An option for **Top-Level**.

4.  Admin clicks **Confirm** → Parent deleted → Children moved under the
    selected parent.

5.  Strapi updates, then syncs changes to **NestJS** via webhook.

## **Step 2 --- Plugin Enhancement (Strapi-Side Code)**

**File:\**
/src/plugins/content-reassignment/admin/src/components/ReassignModal/index.js

import React, { useState } from \'react\';

import { Button } from \'@strapi/design-system/Button\';

import { SingleSelect, SingleSelectOption } from
\'@strapi/design-system/Select\';

import { Typography } from \'@strapi/design-system/Typography\';

import { request } from \'@strapi/helper-plugin\';

const ReassignModal = ({ categoryId, childCategories, onClose }) =\> {

const \[newParentId, setNewParentId\] = useState(null);

const \[loading, setLoading\] = useState(false);

const handleReassign = async () =\> {

if (!newParentId) {

alert(\'Please select a new parent before proceeding.\');

return;

}

setLoading(true);

try {

await request(\`/content-reassignment/reassign\`, {

method: \'POST\',

body: {

oldParentId: categoryId,

newParentId,

childCategories,

},

});

onClose(true);

} catch (err) {

console.error(\'Reassignment failed:\', err);

alert(\'Failed to reassign categories.\');

} finally {

setLoading(false);

}

};

return (

\<div\>

\<Typography variant=\"beta\"\>

This category has {childCategories.length} subcategories. Please select
a new parent.

\</Typography\>

\<SingleSelect

label=\"New Parent Category\"

placeholder=\"Select a parent\"

value={newParentId}

onChange={setNewParentId}

\>

{childCategories.map((cat) =\> (

\<SingleSelectOption key={cat.id} value={cat.id}\>

{cat.name}

\</SingleSelectOption\>

))}

\</SingleSelect\>

\<Button disabled={!newParentId \|\| loading} onClick={handleReassign}\>

Confirm Reassignment

\</Button\>

\<Button variant=\"tertiary\" onClick={() =\> onClose(false)}\>

Cancel

\</Button\>

\</div\>

);

};

export default ReassignModal;



## **Step 3 --- NestJS Sync Endpoint**

When reassignment is completed in Strapi, we **sync to NestJS** so
autocomplete, marketplace filters, and project publishing forms stay
correct.

**File:\**
/apps/api/src/categories/categories.controller.ts

@Post(\'reassign\')

async reassignCategory(@Body() body: ReassignCategoryDto) {

const { oldParentId, newParentId, childCategories } = body;

await this.categoriesService.reassignParent(

oldParentId,

newParentId,

childCategories,

);

return { success: true };

}

**Service Logic:**

****async reassignParent(oldParentId: string, newParentId: string,
childCategories: string\[\]) {

await this.prisma.category.updateMany({

where: { id: { in: childCategories }, parentId: oldParentId },

data: { parentId: newParentId },

});

}



## **Step 4 --- Webhook for Automatic NestJS Update**

Inside **Strapi plugin backend**:

**File:**
/src/plugins/content-reassignment/server/controllers/reassign.js

module.exports = {

async reassign(ctx) {

const { oldParentId, newParentId, childCategories } = ctx.request.body;

// Update Strapi DB

await strapi.db.query(\'api::category.category\').updateMany({

where: { id: { \$in: childCategories } },

data: { parent: newParentId },

});

// Notify NestJS

await fetch(\`\${process.env.NEST_API_URL}/categories/reassign\`, {

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

Authorization: \`Bearer \${process.env.NEST_SYNC_TOKEN}\`,

},

body: JSON.stringify({ oldParentId, newParentId, childCategories }),

});

ctx.send({ ok: true });

},

};



## **Step 5 --- Admin UI Limitations**

Strapi Admin UI is flexible, but has these constraints:

- **Native UI doesn't handle cascading reassignments** → We must build a
  plugin.

- No bulk auto-reassignment → Admin must manually select the new parent.

- Required fields like created_at and updated_at are auto-managed by
  Strapi and must **never** be altered manually.

- We rely on webhooks + custom plugin logic to keep NestJS in sync.

## **Step 6 --- Safety Nets**

- **No automatic deletions:** Child categories **must** be reassigned
  manually.

- **Force new parent selection:** Avoids orphaning subcategories.

- **NestJS + Strapi consistency:** One source of truth, synced in
  real-time.

- **Audit trail:** Every reassignment stored in Strapi's system logs.

## **Next Steps**

1.  Install the **enhanced reassignment plugin** in Strapi.

2.  Test parent deletion + reassignment UI flow.

3.  Validate real-time NestJS sync via webhooks.

4.  Build an admin-facing **"Pending Reassignments"** dashboard for
    cases where admins defer reassignment.
