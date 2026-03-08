# **Migrating Autocomplete Logic to a Dedicated Microservice (Without Breaking Onboarding or Project Publishing)**

This guide provides step-by-step instructions to move all existing
autocomplete logic into a dedicated microservice while **preserving full
functionality** for the onboarding and project publishing screens.

## **✨ Objective**

- Move all autocomplete logic and static JSON files from the
  monolith/frontend repo into a new autocomplete-service microservice.

- Ensure the **onboarding** and **project publishing** screens remain
  fully functional with zero downtime.

- Enable new usage across other areas like global search.

## **🐳 Docker Containerization**

To match your platform\'s architecture, the autocomplete service should
be containerized like your other microservices.

### **✅ Recommended Approach**

Duplicate one of the existing microservices (from /apps/) that already
includes Docker configuration. Choose the **simplest and cleanest**
service to replicate. If unsure, use the most minimal working service as
a base.

### **📦 Steps to Set Up Docker for Autocomplete**

1.  **Duplicate an Existing Service\**

    - Copy an existing folder from /apps/ such as
      /apps/simplest-service/

    - Paste and rename the folder to /apps/autocomplete-service/

2.  **Replace Logic\**

    - Remove everything inside src/

    - Insert the autocomplete logic already provided in this guide into
      the new src/ folder

3.  **Update Metadata\**

    - In package.json, rename the service:

\"name\": \"autocomplete-service\"

- In main.ts, confirm the app listens on the appropriate port (e.g.
  3000)

- Confirm Dockerfile exposes that same port

4.  **Test Locally\**

****docker build -t autocomplete-service .

docker run -p 3000:3000 autocomplete-service

5.  **Push to GitHub\**

    - GitHub URL:
      [[https://github.com/Marketeq/marketeq-projects-nestjs/tree/main/apps/autocomplete-service\]{.underline}
      ](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main/apps/autocomplete-service)

6.  **Deploy to Render\**

    - Link the container build to Render and deploy at:

https://autocomplete.api.marketeq.com

7.  **Add Health Check Route** (Optional)

@Get(\'/\')

healthCheck() {

return { status: \'ok\', service: \'autocomplete\' };

}



## **🗂️ Current Structure**

### **Location:**

****/web-app/

└── data/

└── autocomplete/

├── skills.json

├── job_titles.json

└── etc\...

### **Current Integration:**

Autocomplete fields directly import from /data/autocomplete/\*.json
using static imports or fetches.

## **⚙️ New Structure (Microservice)**

In your GitHub repo
([[marketeq-projects-nestjs]{.underline}](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main/apps)),
place the new microservice in:

/apps/autocomplete-service/

├── src/

│ ├── main.ts

│ ├── app.module.ts

│ └── autocomplete/

│ ├── autocomplete.controller.ts

│ ├── autocomplete.service.ts

│ └── utils/

│ └── json-loader.ts

├── data/

│ └── autocomplete/

│ ├── skills.json

│ └── etc\...

└── package.json

✅ GitHub URL:
[[https://github.com/Marketeq/marketeq-projects-nestjs/tree/main/apps/autocomplete-service]{.underline}](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main/apps/autocomplete-service)

## **🔄 Step-by-Step Migration Instructions**

### **1. Clone and Setup the New Microservice**

- Create folder: /apps/autocomplete-service

- Scaffold with Nest.js:

cd apps

docker run \--rm -it -v \$PWD:/app -w /app node npx -y \@nestjs/cli new
autocomplete-service

- Copy over the contents of /web-app/data/autocomplete/ to:

/apps/autocomplete-service/data/autocomplete/



### **2. Build JSON Serving Logic**

Create a GET /autocomplete/:type?q=query endpoint in
autocomplete.controller.ts:

@Get(\'/:type\')

async getAutocomplete(@Param(\'type\') type: string, \@Query(\'q\')
query: string) {

return this.autocompleteService.query(type, query);

}

And in autocomplete.service.ts:

import Fuse from \'fuse.js\';

import \* as fs from \'fs\';

import \* as path from \'path\';

\@Injectable()

export class AutocompleteService {

async query(type: string, q: string) {

const filepath = path.join(\_\_dirname, \'../../data/autocomplete\',
\`\${type}.json\`);

const raw = fs.readFileSync(filepath, \'utf-8\');

const data = JSON.parse(raw);

const fuse = new Fuse(data, { keys: \[\'label\'\], threshold: 0.3 });

return q ? fuse.search(q).map(r =\> r.item) : data.slice(0, 10);

}

}



### **3. Deploy the Microservice**

- Push the new service to GitHub under apps/autocomplete-service

- Deploy to Render or another microservice environment (e.g.
  https://autocomplete.api.marketeq.com)

### **4. Update Onboarding & Publishing Frontend to Fetch from API**

#### **Instead of:**

****import skills from \'@/data/autocomplete/skills.json\';

#### **Use:**

****const res = await
fetch(\'https://autocomplete.api.marketeq.com/autocomplete/skills?q=ux\');

const skills = await res.json();

📢 **Important:** Do NOT delete the local imports yet.

Wrap your autocomplete fetching logic in a helper:

export const fetchAutocomplete = async (type: string, q = \'\') =\> {

try {

const res = await
fetch(\`https://autocomplete.api.marketeq.com/autocomplete/\${type}?q=\${q}\`);

return await res.json();

} catch (err) {

return import(\`@/data/autocomplete/\${type}.json\`).then(m =\>
m.default);

}

};

This ensures a fallback to static JSON in case the microservice is
unreachable.

✅ This is **critical** to avoid breaking the **onboarding** and
**publish project** sprints.

### **5. Test and Validate**

- Test autocomplete on onboarding flow

- Test autocomplete on publish project screen

- Test against slow or broken network (fallback works?)

- Test against typo/fuzzy match cases

- Confirm JSON files and endpoint logic match current onboarding field
  structure

- Confirm existing functionality is fully preserved with no data loss

## **🔐 Preserve Integrity**

- Ensure JSON file structure, property names, and keys (label, id, etc.)
  are preserved 1:1

- Do **not** change field format or shape (will break dropdown
  integration)

- Expose only relevant endpoints /autocomplete/:type?q= to avoid
  over-exposing backend

## **✅ Once Confirmed:**

- Delete unused local /data/autocomplete folder

- Keep types/\*.d.ts if needed for TS definitions

- Remove temporary imports and fallback logic if microservice is stable

## **📅 Estimated Timeline**

- Microservice setup: 1 hour

- API logic + Fuse.js config: 1 hour

- Frontend migration + fallback logic: 1--2 hours

- QA Testing: 1 hour

Total: **\~4--5 hours** for smooth, non-breaking migration.
