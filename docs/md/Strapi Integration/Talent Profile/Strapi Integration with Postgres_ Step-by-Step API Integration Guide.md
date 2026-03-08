# **Strapi Integration with Postgres: Step-by-Step API Integration Guide**

### **📌 Purpose**

This guide explains how to integrate Strapi with an existing PostgreSQL
database using the Strapi API. It covers how to connect Strapi to the
database, define content types, expose REST/GraphQL endpoints, and
consume them from other backend services.

### **✅ Prerequisites**

- PostgreSQL already set up and running

- Strapi project initialized (npx create-strapi-app) or running via
  Docker

- API consumers (e.g., NestJS microservices) configured to send/receive
  requests

### **➊ Configure Strapi to Use PostgreSQL**

1.  **Edit** config/database.js (or config/database.ts):

module.exports = ({ env }) =\> ({

connection: {

client: \'postgres\',

connection: {

host: env(\'DATABASE_HOST\', \'127.0.0.1\'),

port: env.int(\'DATABASE_PORT\', 5432),

database: env(\'DATABASE_NAME\', \'your_db_name\'),

user: env(\'DATABASE_USERNAME\', \'your_user\'),

password: env(\'DATABASE_PASSWORD\', \'your_password\'),

ssl: false,

},

},

});

2.  **Create .env file**:

DATABASE_HOST=localhost

DATABASE_PORT=5432

DATABASE_NAME=your_db_name

DATABASE_USERNAME=your_user

DATABASE_PASSWORD=your_password

3.  **Restart Strapi**:

yarn develop

\# or

npm run develop



### **➋ Define Content Types for Your Tables**

Use the Admin UI:

- Go to **Content-Type Builder\**

- Create collections like TalentProfile, Skill, Industry

- Use **relations** (not components) to reference normalized tables

Example for a relation to Skill:

{

\"skills\": {

\"type\": \"relation\",

\"relation\": \"manyToMany\",

\"target\": \"api::skill.skill\"

}

}



### **➌ Enable & Test the REST API**

Use endpoints like:

GET /api/talent-profiles

GET /api/skills

Test with:

curl http://localhost:1337/api/talent-profiles

To make endpoints public:

- Go to **Settings → Roles → Public → Permissions\**

- Enable find and findOne for relevant content types

### **➍ (Optional) Enable GraphQL**

1.  Install plugin:

yarn strapi install graphql

2.  Restart Strapi\
    → Visit http://localhost:1337/graphql for the GraphQL Playground

### **➎ Access from Other Services**

Example in **NestJS** using Axios:

import axios from \'axios\';

const response = await
axios.get(\'http://localhost:1337/api/talent-profiles\');

console.log(response.data);

Use an access token or API key for protected endpoints.

### **🛡 Deployment Tips**

- Never expose the Strapi Admin UI publicly

- Use role-based API access

- Use Strapi for content/internal profile management, not for direct
  public endpoints
