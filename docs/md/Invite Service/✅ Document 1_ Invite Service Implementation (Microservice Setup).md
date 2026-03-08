**✅ Document 1: Invite Service Implementation (Microservice Setup)**

**Overview\**
This microservice handles all invitation-related logic, independently
from other services.

**Technology Stack**

- Node.js with TypeScript

- NestJS framework

- PostgreSQL Database

- Render.com for deployment

### **📁 Project Structure**

****invite-service/

├── src/

│ ├── invite/

│ │ ├── invite.controller.ts

│ │ ├── invite.service.ts

│ │ ├── invite.module.ts

│ │ └── invite.entity.ts

│ ├── app.module.ts

│ └── main.ts

├── Dockerfile

├── package.json

└── render.yaml

## **✅ Updated Invite Service Documentation**

### **Database Schema**

****CREATE TABLE invites (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

email VARCHAR(255) NOT NULL,

role VARCHAR(50) NOT NULL DEFAULT \'Viewer\',

invited_by UUID NOT NULL,

invite_status VARCHAR(20) NOT NULL DEFAULT \'pending\', \-- values:
pending, accepted, declined

invite_link TEXT NOT NULL UNIQUE,

expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL \'30
days\'),

created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);

### **Invite Microservice API Endpoint (Backend Logic)**

**invite.controller.ts**

****\@Post(\'invites\')

async createInvite(@Body() body: { email: string; role: string;
invitedBy: string }) {

return await this.inviteService.createInvite(body.email, body.role,
body.invitedBy);

}

**invite.service.ts**

****async createInvite(email: string, role: string, invitedBy: string):
Promise\<Invite\> {

const invite = this.inviteRepo.create({

email,

role,

invited_by: invitedBy,

invite_link: \`https://app.example.com/invite/\${uuidv4()}\`,

expires_at: addDays(new Date(), 30),

});

return await this.inviteRepo.save(invite);

}

### **Frontend Invite Window Component**

Update only the invite action logic within your React component with the
following code:

const handleInvite = async () =\> {

await axios.post(\'https://invite-service.yourdomain.com/invites\', {

email,

role,

invitedBy: currentUserId, // ensure this is clearly defined

});

setEmail(\'\');

loadInvites(); // reload invites after adding new invite

};

### **Microservice Deployment Configuration (Render)**

Update your Render YAML configuration (render.yaml) as follows:

services:

\- name: invite-service

type: web

env: node

buildCommand: npm install && npm run build

startCommand: npm run start:prod

envVars:

\- key: DATABASE_URL

fromDatabase:

name: invite_db

property: connectionString

databases:

\- name: invite_db

databaseName: invite_db



✅ **Final Checklist for Developers**

- Database schema accurately implemented.

- Backend API endpoints fully functional and tested (Postman tests).

- Frontend integration matches the UI from the Figma Design.

- Invite Service independently deployed as microservice.

- Integration tested end-to-end (frontend → backend).
