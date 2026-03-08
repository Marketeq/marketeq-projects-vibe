### **Document 24: Documentation for Client/End-User API Integration with Content Moderation Microservice**

#### **Overview:**

This document provides a comprehensive guide for integrating the
**Content Moderation Microservice** with the **client-side API**. It
explains how **end-users** (project owners or third-party applications)
can interact with the **Content Moderation API** to submit content for
moderation and receive feedback on the status of their submissions
(approved, rejected, flagged for review).

The guide also details the **API endpoints** exposed by the **Content
Moderation Microservice**, **authentication mechanisms**, **error
handling**, and how to retrieve moderation results from the system.

#### **1. API Endpoints**

##### **1.1. Submit Content for Moderation**

The primary API endpoint allows clients to submit content (including
text and media) for moderation. This endpoint processes the content and
returns the approval status along with any reasons for rejection or
flagging.

**Endpoint**: POST /api/moderate

**Request Body**:

{

\"projectId\": \"12345\",

\"title\": \"Example Project Title\",

\"description\": \"This is an example project description.\",

\"tags\": \[\"web development\", \"node.js\"\],

\"skills\": \[\"JavaScript\", \"Node.js\"\],

\"featuredImage\": \"https://example.com/image.jpg\",

\"additionalImages\": \[\"https://example.com/image2.jpg\"\],

\"videoUrl\": \"https://example.com/video.mp4\"

}

- \
  **projectId**: The ID of the project being submitted.

- **title**: The title of the project.

- **description**: A description of the project.

- **tags**: Keywords or tags associated with the project.

- **skills**: Skills required for the project.

- **featuredImage**: The URL of the main image for the project.

- **additionalImages**: URLs of additional images.

- **videoUrl**: URL of the video associated with the project.

**Response**:

{

\"status\": \"approved\",

\"message\": \"Your project has been successfully published!\"

}

- \
  **status**: The moderation status (approved, rejected, pending).

- **message**: The message providing feedback on the status (e.g.,
  approval or rejection reason).

##### **1.2. Check Moderation Status**

After submitting content, clients can check the **moderation status** of
their project by querying the status endpoint.

**Endpoint**: GET /api/moderate/status/{projectId}

**Response**:

{

\"status\": \"rejected\",

\"reason\": \"Prohibited content detected in the title.\",

\"message\": \"Your project has been rejected due to profanity in the
title.\"

}

- \
  **status**: The current moderation status (approved, rejected,
  pending).

- **reason**: The specific reason for rejection or flagging.

- **message**: A detailed message for the user about the moderation
  result.

##### **1.3. Resubmit Project**

If a project was rejected, the client can make necessary adjustments and
resubmit the project for moderation.

**Endpoint**: POST /api/moderate/resubmit

**Request Body**:

{

\"projectId\": \"12345\",

\"updatedTitle\": \"Updated Title Without Profanity\",

\"updatedDescription\": \"This is an updated project description without
inappropriate content.\"

}

**Response**:

{

\"status\": \"approved\",

\"message\": \"Your project has been successfully updated and
approved!\"

}



#### **2. Authentication and Security**

##### **2.1. Authentication Mechanism**

To access the **Content Moderation API**, clients must authenticate
their requests using **JWT (JSON Web Token)**. Each request to the
moderation endpoints must include the **Authorization header** with the
JWT token.

**Example**:

Authorization: Bearer \<your_jwt_token\>

The **JWT** token is issued during the user login process and should be
passed along with each request to authenticate the user.

##### **2.2. Handling Unauthorized Requests**

If the client does not provide a valid JWT token, the API will respond
with a 401 Unauthorized status code.

**Example Response**:

{

\"status\": \"error\",

\"message\": \"Unauthorized access. Please provide a valid JWT token.\"

}



#### **3. Error Handling**

The **Content Moderation Microservice** provides detailed error
responses in case of any failures. Common errors include issues with
missing data, invalid media, or system errors.

##### **3.1. Common Error Responses**

- **400 Bad Request**: The request body is missing required fields or
  has invalid data.

- **401 Unauthorized**: The request does not include a valid JWT token.

- **500 Internal Server Error**: A server-side issue occurred while
  processing the request.

**Example 400 Error**:

{

\"status\": \"error\",

\"message\": \"Missing required field: title.\"

}

**Example 500 Error**:

{

\"status\": \"error\",

\"message\": \"Internal server error. Please try again later.\"

}



#### **4. Notifications**

The **Content Moderation Microservice** sends **notifications** to users
when their content is approved or rejected. These notifications can be
**in-app notifications**, **emails**, or **push notifications**,
depending on the platform and configuration.

##### **4.1. Example Notification (Email)**

When a project is rejected due to explicit content, the system sends an
email with the following content:

**Subject**: Your project has been rejected due to explicit content.

**Body**:

Hello \[User\],

Your project titled \"\[Project Title\]\" has been rejected due to
explicit content detected in the media you submitted. Please review the
feedback and update your project accordingly.

Thank you,

Content Moderation Team



#### **5. Conclusion**

This document provides the necessary steps and code examples for
**clients** and **end-users** to interact with the **Content Moderation
Microservice API**. It covers the **submission**, **moderation status
checks**, **resubmission process**, **authentication** mechanisms, and
**error handling**. Following these guidelines, clients can efficiently
submit and manage their content while ensuring compliance with the
platform\'s moderation policies.
