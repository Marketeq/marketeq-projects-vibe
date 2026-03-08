**Category Deletion & Child Reassignment -- Strapi Admin + NestJS Sync**

## **1. Overview**

This document defines the **full implementation** for handling **parent
category deletions** in **Strapi Admin** while ensuring:

- No **orphaned child categories** ever exist.

- Admins must **reassign children to a new parent** before deletion.

- NestJS marketplace DB stays in sync via **webhooks + cron fallback**.

- Autocomplete, SEO, and marketplace hierarchy stay **consistent and
  clean**.

## **2. Problem**

Currently, deleting a parent category risks:

- Orphaned child categories

- Broken marketplace hierarchy

- SEO fragmentation

- Autocomplete suggestions showing outdated categories

We solve this by enforcing **mandatory reassignment** at the **Strapi
admin UI** and syncing it to NestJS.

## **3. Core Requirements**

  **Requirement**                              **Implementation Approach**
  -------------------------------------------- -------------------------------------------------------
  **No orphaned child categories**             Force admins to pick a new parent before deleting.
  **No auto-deletion of children**             Admins must delete child categories manually.
  **Sync with NestJS DB**                      Webhook-first + cron-based fallback.
  **Unlimited nesting support**                Works at any depth, like Amazon's taxonomy.
  **Marketplace + autocomplete consistency**   Always reflect the latest parent-child relationships.

## **4. Admin UI Flow**

We'll extend the **Strapi Admin Panel** via a **custom plugin
override**.

### **Step 1 --- Click Delete**

- Admin selects a parent category to delete.

- We intercept the request via **Strapi's admin plugin lifecycle**.

### **Step 2 --- Show Reassignment Modal**

- Display list of **child categories**.

- Provide a **dropdown** to select a new parent category.

- Show warning:

> \"This category has child categories. Please select a new parent
> before deleting, or delete the children manually.\"

### **Step 3 --- Validate Selection**

- If a new parent is selected → move children → delete parent.

- If no selection → block deletion.

### **Step 4 --- Sync Changes**

- Strapi updates DB → triggers webhook → NestJS updates category
  hierarchy.

- NestJS verifies changes via fallback cron.

## **5. Strapi Plugin Implementation**

### **5.1. File Structure**

****/src/plugins/category-reassignment

├── admin

│ ├── components

│ │ └── ReassignModal.js

│ └── index.js

├── server

│ ├── controllers

│ │ └── category.js

│ ├── routes

│ │ └── category.js

│ └── services

│ └── category.js

└── strapi-server.js



### **5.2. Reassign Modal (React)**

****//
/src/plugins/category-reassignment/admin/components/ReassignModal.js

import React, { useState } from \'react\';

import { Modal, Button, Select } from \'@strapi/design-system\';

export default function ReassignModal({ isOpen, onClose, childrenList,
allCategories, onConfirm }) {

const \[selectedParent, setSelectedParent\] = useState(\'\');

return (

\<Modal onClose={onClose} isOpen={isOpen}\>

\<h2\>Reassign Child Categories\</h2\>

\<p\>This parent category has {childrenList.length} subcategories.
Select a new parent:\</p\>

\<Select

placeholder=\"Select a new parent\"

onChange={(value) =\> setSelectedParent(value)}

options={allCategories.map(c =\> ({ label: c.name, value: c.id }))}

/\>

\<Button disabled={!selectedParent} onClick={() =\>
onConfirm(selectedParent)}\>

Confirm Reassignment

\</Button\>

\</Modal\>

);

}



### **5.3. Strapi Service Logic**

****// /src/plugins/category-reassignment/server/services/category.js

module.exports = {

async reassignChildren(oldParentId, newParentId) {

const knex = strapi.db.connection;

// Reassign all child categories

await knex(\'marketplace_categories\')

.where({ parent_id: oldParentId })

.update({ parent_id: newParentId });

// Delete the old parent

await knex(\'marketplace_categories\').where({ id: oldParentId }).del();

// Fire webhook for NestJS sync

await
strapi.plugins\[\'webhook\'\].services.webhook.trigger(\'category-reassigned\',
{

oldParentId,

newParentId,

});

return { success: true };

},

};



## **6. Webhook → NestJS Sync**

### **6.1. Strapi Webhook**

Triggers on reassignment:

{

\"event\": \"category.reassigned\",

\"data\": {

\"oldParentId\": \"123\",

\"newParentId\": \"456\"

}

}

### **6.2. NestJS Listener**

****\@Post(\'/categories/reassigned\')

async handleCategoryReassigned(@Body() data: any) {

await this.categoriesService.updateChildParent(data.oldParentId,
data.newParentId);

}



## **7. Fallback Cron Job**

Runs every **10 minutes** in NestJS:

@Cron(\'\*/10 \* \* \* \*\')

async verifyCategoryHierarchy() {

const strapiCategories = await this.strapiService.fetchAllCategories();

const dbCategories = await this.categoryRepository.find();

// Compare parent IDs → repair mismatches automatically

}



## **8. QA Checklist**

  -------------------------------------------------------------
  **Test Case**                      **Expected Result**
  ---------------------------------- --------------------------
  Delete parent without children     Deletes immediately

  Delete parent with children, no    Blocked
  reassignment                       

  Delete parent with reassignment    Children moved → parent
                                     deleted

  Webhook success                    NestJS DB updated
                                     instantly

  Webhook fails                      Cron resolves mismatch

  Unlimited nesting                  Works at any depth

  Orphan check                       No children exist without
                                     a parent
  -------------------------------------------------------------

## **9. Key Takeaways**

- **Admins choose reassignment manually.\**

- **Children are never auto-deleted.\**

- **NestJS syncs instantly** via webhooks and validates via cron.

- **Marketplace + autocomplete** stay perfectly aligned.
