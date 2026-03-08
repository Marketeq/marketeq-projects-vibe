✅ **Screen 1: Project Details Review -- Front-End Integration Guide**

### **🧩 Purpose of the Screen**

This screen is for **final confirmation of the project scope and
selected team members** before entering the checkout flow.

### **✅ Primary UI Elements**

1.  **Project Title + Summary\**

2.  **Project Scope & Timeline\**

3.  **Team Members (Talent Network Cards)\**

4.  **Pricing Summary\**

5.  **Back / Continue CTA\**

### **🔌 Backend API Calls**

#### **1. Fetch Project Scope (from Listing Service)**

- **Endpoint**: GET /listing/:listingId

- **Service**: Listing Service

- **Purpose**: Get project description, deliverables, duration, and
  budget.

- **Expected Response**:

{

\"title\": \"Redesign SaaS Dashboard\",

\"description\": \"End-to-end UX/UI redesign for SaaS dashboard\",

\"deliverables\": \[\"UI Screens\", \"Design System\", \"Prototypes\"\],

\"durationWeeks\": 8,

\"budget\": 12000,

\"phases\": \[

{

\"name\": \"Research & Wireframing\",

\"durationWeeks\": 2

},

{

\"name\": \"UI Design\",

\"durationWeeks\": 4

},

{

\"name\": \"Prototyping & Handoff\",

\"durationWeeks\": 2

}

\]

}

> 

#### **2. Fetch Team Members (from User Service)**

- **Endpoint**: POST /users/batch

- **Service**: User Service

- **Purpose**: Retrieve user cards for talent selected for the project.

- **Request Payload**:

{

\"userIds\": \[\"usr_01\", \"usr_02\", \"usr_03\"\]

}

- **Expected Response**:

\[

{

\"id\": \"usr_01\",

\"name\": \"Sally\",

\"role\": \"Frontend Developer\",

\"company\": \"MoonBabe\",

\"location\": \"Italy\",

\"rating\": 4.6,

\"completedProjects\": 15,

\"skills\": \[\"React\", \"Tailwind\", \"Prototyping\"\],

\"rate\": {

\"min\": 85,

\"max\": 120

}

}

\]

> 

### **🧠 Front-End Logic**

- **Project & Scope Info** is displayed in a summary section.

- **Talent Cards** are rendered from the /users/batch call and styled
  per design.

- **Pricing Total** comes directly from the Listing Service's budget
  field.

- CTA buttons should **only activate once data is loaded**.

- No payment method, billing, or frequency logic is handled here.
