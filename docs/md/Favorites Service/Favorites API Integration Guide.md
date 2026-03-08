## **Favorites API Integration Guide**

### **1. Authentication**

All /favorites calls require a valid JWT in the Authorization header:

Authorization: Bearer \<access_token\>

In your NextAuth setup, you should expose the token on the client as
session.accessToken. Use whatever method you already have to pull it out
(e.g. getSession()).

### **2. Endpoints & Payloads**

  **Method**   **URL**          **Request Body**                                                 **Response Body**                                                                                                  **Notes**
  ------------ ---------------- ---------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------ --------------------------------------------------------------------
  POST         /favorites       { type: string, itemId: string, \<optional\> groupId: string }   { id: string, userId: string, groupId: string, type: string, itemId: string, createdAt: string }                   If groupId is omitted, backend AI or logic will assign/create one.
  GET          /favorites       *none*                                                           \[{ id: string, name: string, createdAt: string, favorites: \[ { id, type, itemId, createdAt, metadata? } \] }\]   Returns all groups, each with its favorites.
  PATCH        /favorites/:id   { groupId: string }                                              { id: string, userId: string, groupId: string, type: string, itemId: string, createdAt: string }                   Moves one favorite into another group.
  DELETE       /favorites/:id   *none*                                                           { success: true } (or simply HTTP 204 No Content)                                                                  Removes the favorite.

- **Content-Type:** application/json

- **Base URL:** your API host (e.g. https://api.marketeq.com or
  http://localhost:4003)

### **3. Common Response Shapes**

**Successful POST**

****{

\"id\": \"fav-123\",

\"userId\": \"user-abc\",

\"groupId\": \"grp-xyz\",

\"type\": \"project\",

\"itemId\": \"proj-456\",

\"createdAt\": \"2025-07-25T12:34:56.789Z\"

}

**Successful GET**

****\[

{

\"id\": \"grp-xyz\",

\"name\": \"Mobile Apps\",

\"createdAt\": \"2025-01-15T09:00:00.000Z\",

\"favorites\": \[

{

\"id\": \"fav-123\",

\"type\": \"project\",

\"itemId\": \"proj-456\",

\"createdAt\": \"2025-07-25T12:34:56.789Z\",

\"metadata\": {

\"title\": \"Local Gym Funnel\",

\"description\": \"A complete funnel system for\...\"

}

},

// ...more items...

\]

},

// ...more groups...

\]

**Error Responses**

- **401 Unauthorized\**

****{ \"statusCode\": 401, \"error\": \"Unauthorized\" }

- \
  **400 Bad Request** (e.g. invalid groupId)

{ \"statusCode\": 400, \"error\": \"Invalid groupId\" }

- \
  **429 Too Many Requests** (if rate-limited)

{ \"statusCode\": 429, \"error\": \"Too many requests\" }



### **4. Client‑Side Usage Examples**

#### **a) Axios Instance with Auth**

****import axios from \'axios\';

import { getSession } from \'next-auth/react\';

async function createClient() {

const session = await getSession();

return axios.create({

baseURL: process.env.NEXT_PUBLIC_FAVORITES_API_URL,

headers: {

Authorization: session?.accessToken

? \`Bearer \${session.accessToken}\`

: \'\',

},

});

}

#### **b) Fetch All Favorites**

****const client = await createClient();

const { data: groups } = await client.get(\'/favorites\');

// \`groups\` is an array of group objects

#### **c) Add a Favorite**

****await client.post(\'/favorites\', {

type: \'project\',

itemId: \'proj-456\'

});

// Optionally pass \`groupId\` if the user selected one:

await client.post(\'/favorites\', {

type: \'talent\',

itemId: \'user-789\',

groupId: \'grp-123\'

});

#### **d) Move a Favorite**

****await client.patch(\`/favorites/\${favId}\`, {

groupId: \'new-group-id\'

});

#### **e) Remove a Favorite**

****await client.delete(\`/favorites/\${favId}\`);



### **5. Integration Tips**

- **Handling Loading State:** Show spinners or disable controls while
  awaiting responses.

- **Optimistic Updates:** After a POST/PATCH/DELETE you can immediately
  reflect the change in UI before re‑fetch, or simply re‑fetch the list.

- **Error Handling:\**

  - On **401**, redirect to sign‑in.

  - On **429**, show "Please wait a moment before trying again."

  - On **400**, surface the backend's message (e.g. "Invalid group
    selected").
