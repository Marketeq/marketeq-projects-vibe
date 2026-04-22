# **11 - Category Sync -- Testing & QA Checklist (With Postman & SQL Samples)**

## **Purpose**

Full QA checklist for category syncing and validation with ready-to-use
Postman requests and SQL queries for QA testers.

## **1. Payload ↔ NestJS Sync**

### **Postman: Payload → NestJS**

- **Create Category (Payload):\**

****POST {{STRAPI_URL}}/categories

Body:

{

\"name\": \"Test Category\"

}

- **Verify in NestJS:\**

****GET {{NEST_URL}}/categories

- **Check UUID/Slug Match\**

### **SQL Check:**

****SELECT uuid, name, slug, parent_id FROM categories WHERE name =
\'Test Category\';

### **NestJS → Payload**

- **Create User Subcategory (NestJS):\**

****POST {{NEST_URL}}/categories/user

Body:

{ \"name\": \"New User Subcategory\" }

- **Verify in Payload:\**

****GET {{STRAPI_URL}}/categories?filters\[name\]\[\$eq\]=New User
Subcategory



## **2. Cron Fallback Validation**

### **Disable Webhook, Trigger Cron:**

- Temporarily turn off Payload webhook.

- Create a new category in Payload.

- Wait for 10-min cron to run.

- **SQL Check:\**

****SELECT \* FROM categories WHERE name = \'Cron Test Category\';



## **3. Unlimited Nesting**

### **Postman:**

- Create multiple levels in Payload:

POST {{STRAPI_URL}}/categories

{ \"name\": \"Level 1\" }

- (Repeat with parent_id for Level 2--6)

- **Check Tree:\**

****GET {{NEST_URL}}/categories/tree

- **Check Breadcrumbs:\**

****GET {{NEST_URL}}/categories/{{UUID}}/breadcrumbs

### **SQL Check:**

****SELECT uuid, parent_id FROM categories ORDER BY created_at DESC;



## **4. SEO Defaults & Overrides**

### **Postman:**

- Create category with no SEO fields.

- Fetch frontend page:

GET {{FRONTEND_URL}}/categories/test-category

- Verify default meta title/description.

- Add SEO override in Payload:

PATCH {{STRAPI_URL}}/categories/{{UUID}}

{

\"seo_meta_title\": \"Custom Title\",

\"seo_meta_description\": \"Custom Description\"

}

- **SQL Check:\**

****SELECT seo_meta_title, seo_meta_description FROM categories WHERE
uuid=\'{{UUID}}\';



## **5. Content Reassignment on Deletion**

### **Postman:**

- Link project to category:

PATCH {{NEST_URL}}/projects/{{PROJECT_UUID}}

{

\"categories\": \[\"{{CATEGORY_UUID}}\"\]

}

- Delete category in Payload:

DELETE {{STRAPI_URL}}/categories/{{CATEGORY_UUID}}

- **SQL Check:\**

****SELECT categories FROM projects WHERE uuid=\'{{PROJECT_UUID}}\';



## **6. Autocomplete Sync**

### **Postman:**

- Create category in Payload.

- Test Autocomplete:

GET {{AUTOCOMPLETE_URL}}/autocomplete/categories?q=Test

- \
  Create user-generated category via NestJS.

- Verify Autocomplete again:

GET {{AUTOCOMPLETE_URL}}/autocomplete/categories?q=New

### **SQL Check:**

****SELECT name FROM categories WHERE name ILIKE \'%Test%\';



## **7. QA Notes**

- Always verify with both parent and subcategories.

- Use Postman collections to automate common sync tests.

- Use SQL queries for backend verification.

- Track UUID consistency across both systems.

✅ **Deliverables:**

- Postman collection with all endpoints preloaded.

- SQL scripts for QA to run inside the Render Postgres dashboard.
