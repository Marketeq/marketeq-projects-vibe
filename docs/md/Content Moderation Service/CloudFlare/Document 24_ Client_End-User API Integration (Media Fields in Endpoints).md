### **Document 24: Client/End-User API Integration (Media Fields in Endpoints)**

#### **Overview**

This guide shows **exactly** how clients (project owners or third-party
apps) integrate with the **Content Moderation Microservice** to:

- **Submit** a project for moderation (including Cloudflare-hosted media
  URLs)

- **Check** the moderation status

- **Resubmit** after corrections

All media fields---featuredImage, additionalImages, and videoUrl---must
be Cloudflare R2 URLs obtained via your /media/upload flow. Nothing else
changes.

#### **1. Authentication**

All requests require a valid **JWT** in the Authorization header:

Authorization: Bearer \<your_jwt_token\>

Requests without or with invalid tokens receive 401 Unauthorized.

#### **2. Submit Project for Moderation**

**Endpoint**

****POST /api/moderate

Content-Type: application/json

**Request Body**

****{

\"projectId\": \"550e8400-e29b-41d4-a716-446655440000\",

\"title\": \"My Cool Project\",

\"description\": \"Detailed project description goes here.\",

\"tags\": \[\"design\",\"ux\"\],

\"skills\": \[\"Figma\",\"Illustrator\"\],

\"featuredImage\": \"https://imagedelivery.net/ACCOUNT_ID/KEY/public\",

\"additionalImages\": \[

\"https://imagedelivery.net/ACCOUNT_ID/KEY2/public\",

\"https://imagedelivery.net/ACCOUNT_ID/KEY3/public\"

\],

\"videoUrl\": \"https://imagedelivery.net/ACCOUNT_ID/KEY4/public\"

}

- \
  **projectId**: UUID of the draft project

- **featuredImage**: single Cloudflare URL

- **additionalImages**: zero or more Cloudflare URLs

- **videoUrl**: optional Cloudflare URL

**Example Client Call (JavaScript)**

****async function submitForModeration(dto) {

const res = await fetch(\'/api/moderate\', {

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

\'Authorization\': \`Bearer \${token}\`,

},

body: JSON.stringify(dto),

});

if (res.status === 422) {

const err = await res.json();

throw new Error(err.message); // e.g. \"Media contains explicit
content.\"

}

return res.json(); // { status: \'approved\' \| \'rejected\' \|
\'pending\', message: string }

}

**Success Response (200 OK)**

****{

\"status\": \"approved\",

\"message\": \"Content is clean.\"

}

**Rejection Response (422 Unprocessable Entity)**

****{

\"status\": \"rejected\",

\"message\": \"Media contains explicit content.\"

}



#### **3. Check Moderation Status**

If you prefer polling instead of waiting on the initial response, use:

**Endpoint**

****GET /api/moderate/status/{projectId}

**Response (200 OK)**

****{

\"status\": \"pending\", // or \"approved\" or \"rejected\"

\"reason\": \"Media contains explicit content.\", // only on rejected

\"message\": \"Your project is under review.\"

}



#### **4. Resubmit After Corrections**

After fixing any rejected fields (e.g., replacing an image), resubmit:

**Endpoint**

****POST /api/moderate/resubmit

Content-Type: application/json

**Request Body**

****{

\"projectId\": \"550e8400-e29b-41d4-a716-446655440000\",

\"updatedTitle\": \"My Updated Title\", // only include changed fields

\"featuredImage\": \"https://imagedelivery.net/...\",

\"additionalImages\": \[ /\* new URLs \*/ \],

\"videoUrl\": null

}

**Success Response (200 OK)**

****{

\"status\": \"approved\",

\"message\": \"Your project has been successfully updated and
approved!\"

}

**Failure Response (422 Unprocessable Entity)**

****{

\"status\": \"rejected\",

\"message\": \"Media contains explicit content.\"

}



#### **5. Common Error Responses**

  ----------------------------------------------------------------------------
  **Status**      **Code**   **Body**
  --------------- ---------- -------------------------------------------------
  Missing token   401        { \"status\":\"error\",\"message\":\"Unauthorized
                             access.\" }

  Missing         400        { \"status\":\"error\",\"message\":\"Missing
  required field             field: featuredImage\" }

  Invalid JSON    400        { \"status\":\"error\",\"message\":\"Invalid JSON
                             payload.\" }

  Unhandled       500        { \"status\":\"error\",\"message\":\"Internal
  server error               server error.\" }
  ----------------------------------------------------------------------------

With these details, **clients** can implement exactly the same
moderation integration---only swapping in Cloudflare-hosted media URLs
for storage. No other changes required.
