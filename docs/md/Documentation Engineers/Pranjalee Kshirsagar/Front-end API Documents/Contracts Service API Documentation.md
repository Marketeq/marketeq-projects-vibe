## **Contracts Service API Documentation** 

## **Base URL**

- **Local:** http://localhost:4006

## **Authentication**

- **Send JWT token in header (required for all endpoints in this
  doc):\**
  Authorization: Bearer \<token\>

- **Internal/service-to-service endpoints:\**
  *(For Contracts we are documenting JWT-only as required; if later you
  add service-token auth for webhooks, you can add it here.)\*
  x-service-token: \<SERVICE_TOKEN\> *(optional / future)*

## **Content Type**

- Content-Type: application/json

## **Standard Error Pattern (Typical)**

- **401 Unauthorized** → Missing/invalid token (JWT required)

- **429 Too Many Requests** → Rate limiting (when enabled)

# **1. System Overview**

The **Contracts Service** manages the lifecycle of contracts between a
**client** and **talent**. Contracts can be created in bulk using a
**Contract Group**, which supports bundled deposit payment through
Checkout. Contracts move through states like **pending → active →
ended/canceled**, and the service also consumes webhooks/events to
update contract state.

# **2. High Level Architecture**

At a high level, the service is a NestJS microservice behind the API
Gateway and validates JWT for all requests. It persists **Contract** and
**ContractGroup** entities in Postgres (via TypeORM), emits/consumes
events for the deposit and billing lifecycle, and exposes REST endpoints
for frontend flows like hire, respond, end, and list contracts.

# **3. Workflow Overview**

### **Workflow A --- Start Contract Flow (Client hires multiple talents)**

1.  Client creates a **contract group** with N contracts.

2.  All contracts start as **pending** and await bundled deposit
    payment.

3.  Checkout sends webhook **deposit-cleared**, and Contracts Service
    activates all group contracts atomically.

### **Workflow B --- Offer Response (Talent accepts/rejects)**

1.  Talent accepts/rejects the offer using /contracts/:id/respond.

2.  If accepted, the contract still waits for deposit (pending → active
    happens only after deposit clears).

### **Workflow C --- End Contract (Client ends one contract)**

1.  Client ends a single contract using /contracts/:id/end.

2.  Contract is marked ended and billing/review follow-ups are triggered
    downstream.

# **4. Key Dependencies and Modules**

- **API Gateway**: issues JWT and routes requests to contracts-service;
  Contracts validates JWT per request.

- **Checkout Service**: handles bundled deposit; sends
  deposit-cleared/deposit-failed events.

- **Billing Service**: sends billing.finalized webhook payloads after
  end-of-contract billing completes.

- **Time Tracking / Reviews / Notifications**: affected by contract
  lifecycle events (activation, end, dispute).

# **5. Current State and Responsibilities**

### **Current State (What exists now)**

- Core API endpoints for **contract group creation**, **offer
  response**, **end contract**, and **contract queries** are defined in
  docs and described for frontend integration.

- Entities and lifecycle states exist for Pending/Active/Ended/Canceled.

- Webhook endpoints exist for deposit-cleared and billing-finalized
  flows.

### **Responsibilities**

- Provide frontend a stable REST interface for contract flows.

- Ensure group activation is atomic after deposit clears.

- Publish/consume lifecycle events so other services
  (Billing/Reviews/etc.) remain consistent.

# **6. Access & Tools**

  **Tool**                  **Purpose**                                **Notes**
  ------------------------- ------------------------------------------ -------------------------------------------------------------------------------------------------------------------
  GitHub Repo               Contracts service codebase                 [marketeq-projects-nestjs](https://github.com/Marketeq/marketeq-projects-nestjs/tree/main)/apps/contracts-service
  API Gateway Base URL      Gateway routing for contracts-service      Example: https://api.\<env\>.com/contracts-service
  Postman                   Test endpoints manually                    Use environment variables for base URL + token
  DB Admin (Postgres)       Inspect contract / contract_group tables   Read-only access preferred for non-dev
  Logging / Observability   Debug request flow + webhooks              Example: Render logs / Grafana / Sentry
  Local Environment         Run service locally                        .env contains JWT secret, DB URL, service ports

# **7. Authentication & Headers**

### **JWT Bearer Authentication (Required)**

- All endpoints require:

  - Authorization: Bearer \<JWT_TOKEN\>

- JWT payload includes user id and role (client/talent).

### **Standard Headers**

- Content-Type: application/json

- Authorization: Bearer \<JWT_TOKEN\>

# **8. API Endpoints**

## **8.1 Implemented Endpoints (Backend Code)**

### **8.1.1 Create Contract Group (Client hires N talents)**

**Endpoint:** POST /contract-groups

**Summary :\**
Creates one **ContractGroup** plus multiple **Contract** records (one
per talent). Contracts start in pending state until the deposit clears.
The frontend should redirect the client to Checkout to complete the
bundled deposit payment.

**Auth:** JWT required.

**Request Body**

  -----------------------------------------------------------------------
  {\
  \"type\": \"project\",\
  \"ownerClientId\": \"cli-123\",\
  \"projectId\": \"proj-999\",\
  \"contracts\": \[\
  {\
  \"talentId\": \"tal-1\",\
  \"title\": \"Frontend Developer\",\
  \"rate\": 70,\
  \"schedule\": \"full-time\",\
  \"duration\": \"6 months\"\
  }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"groupId\": \"grp-789\",\
  \"contracts\": \[\
  { \"id\": \"c1\", \"talentId\": \"tal-1\", \"status\": \"pending\" },\
  { \"id\": \"c2\", \"talentId\": \"tal-2\", \"status\": \"pending\" }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contract-groups\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Authorization\": \`Bearer \${token}\`\
  },\
  body: JSON.stringify({\
  type: \"project\",\
  ownerClientId: \"cli-123\",\
  projectId: \"proj-999\",\
  contracts: \[\
  { talentId: \"tal-1\", title: \"Frontend Developer\", rate: 70,
  schedule: \"full-time\", duration: \"6 months\" }\
  \]\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.2 Get Contract Group by ID (Group + Contracts)**

**Endpoint:** GET /contract-groups/:id

**Summary :\**
Returns a contract group and the contracts under it. Frontend can use
this to refresh the group's deposit state (depositPaid) and show status
per talent. This is useful after returning from the Checkout flow.

**Auth:** JWT required.

**Request Parameters**

- id (path): Contract group ID (UUID)

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"grp-789\",\
  \"type\": \"project\",\
  \"ownerClientId\": \"cli-123\",\
  \"projectId\": \"proj-999\",\
  \"depositPaid\": false,\
  \"contracts\": \[\
  {\
  \"id\": \"c1\",\
  \"groupId\": \"grp-789\",\
  \"clientId\": \"cli-123\",\
  \"talentId\": \"tal-1\",\
  \"title\": \"Frontend Developer\",\
  \"rate\": 70,\
  \"schedule\": \"full-time\",\
  \"duration\": \"6 months\",\
  \"status\": \"pending\",\
  \"startAtISO\": null,\
  \"endAtISO\": null\
  }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contract-groups/grp-789\`, {\
  method: \"GET\",\
  headers: { \"Authorization\": \`Bearer \${token}\` }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.3 Accept / Reject Offer (Talent Side)**

**Endpoint:** PUT /contracts/:id/respond

**Summary :\**
Talent accepts or rejects a contract offer. If accepted, the contract
remains pending until the deposit is paid, and the response indicates
it's waiting for deposit. If rejected, the service records the decision
and the client should no longer expect activation.

**Auth:** JWT required.

**Request Body**

  -----------------------------------------------------------------------
  {\
  \"accepted\": true,\
  \"talentId\": \"tal-1\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"c1\",\
  \"message\": \"Offer accepted. Waiting for deposit.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contracts/c1/respond\`, {\
  method: \"PUT\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Authorization\": \`Bearer \${token}\`\
  },\
  body: JSON.stringify({ accepted: true, talentId: \"tal-1\" })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.4 End a Contract (Client Side)**

**Endpoint:** PUT /contracts/:id/end

**Summary :\**
Client ends a single contract (one talent). Ending is individual-only;
it does not automatically end other contracts in the same group. The
response includes billing/review window details that frontend can use to
redirect user to the review screen.

**Auth:** JWT required.

**Request Body**

  -----------------------------------------------------------------------
  {\
  \"reasonCode\": \"SERVICE_NO_LONGER_NEEDED\",\
  \"notes\": \"Work wrapped up earlier than expected.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"contractId\": \"c1\",\
  \"status\": \"ended\",\
  \"billing\": { \"finalInvoice\": \"INV-123\", \"credit\": 50.0 },\
  \"reviewWindow\": \"90 days open\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contracts/c1/end\`, {\
  method: \"PUT\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Authorization\": \`Bearer \${token}\`\
  },\
  body: JSON.stringify({\
  reasonCode: \"SERVICE_NO_LONGER_NEEDED\",\
  notes: \"Work wrapped up earlier than expected.\"\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.5 Get Contract by ID**

**Endpoint:** GET /contracts/:id

**Summary :\**
Fetches a single contract for contract summary screens and state
refresh. This is the canonical endpoint to read current contract status
and lifecycle timestamps. It is often used after webhook-triggered
changes (pending → active).

**Auth:** JWT required.

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"c1\",\
  \"clientId\": \"cli-123\",\
  \"talentId\": \"tal-1\",\
  \"title\": \"Frontend Developer\",\
  \"rate\": 70,\
  \"schedule\": \"full-time\",\
  \"duration\": \"6 months\",\
  \"status\": \"active\",\
  \"startAtISO\": \"2025-10-01T12:00:00Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contracts/c1\`, {\
  method: \"GET\",\
  headers: { \"Authorization\": \`Bearer \${token}\` }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.6 Get All Contracts for a Client**

**Endpoint:** GET /contracts/client/:clientId

**Summary :\**
Returns a lightweight list of contracts owned by a client for dashboards
(active/completed). The response is typically summarized (id, title,
status) and the frontend can call /contracts/:id for full details. This
endpoint helps avoid loading the entire contract dataset.

**Auth:** JWT required.

**Response Body (example)**

  -----------------------------------------------------------------------
  \[\
  { \"id\": \"c1\", \"title\": \"Frontend Dev\", \"status\": \"active\"
  },\
  { \"id\": \"c2\", \"title\": \"UX Designer\", \"status\": \"ended\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contracts/client/cli-123\`, {\
  method: \"GET\",\
  headers: { \"Authorization\": \`Bearer \${token}\` }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.7 Get All Contracts for a Talent**

**Endpoint:** GET /contracts/talent/:talentId

**Summary :\**
Returns a list of contracts for the talent's dashboard. This supports
"current work" and "past work" views while keeping payload small. The
talent can open a contract details screen using /contracts/:id.

**Auth:** JWT required.

**Response Body (example)**

  -----------------------------------------------------------------------
  \[\
  { \"id\": \"c1\", \"title\": \"Frontend Dev\", \"status\": \"active\"
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contracts/talent/tal-1\`, {\
  method: \"GET\",\
  headers: { \"Authorization\": \`Bearer \${token}\` }\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.8 Webhook: Deposit Cleared (Checkout → Contracts)**

**Endpoint:** POST /webhooks/checkout/deposit-cleared

**Summary :\**
Triggered by Checkout after a bundled deposit is successfully paid.
Contracts Service marks the group depositPaid = true and activates all
pending contracts in that group. Frontend does not call this endpoint,
but state changes will reflect in /contracts/:id and
/contract-groups/:id.

**Auth:** JWT required (per requirement for this documentation).

**Request Body (example)**

  -----------------------------------------------------------------------
  {\
  \"groupId\": \"grp-123\",\
  \"paymentRef\": \"chk_abc123\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"groupId\": \"grp-123\",\
  \"status\": \"activated\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/webhooks/checkout/deposit-cleared\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Authorization\": \`Bearer \${token}\`\
  },\
  body: JSON.stringify({ groupId: \"grp-123\", paymentRef: \"chk_abc123\"
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.1.9 Webhook: Billing Finalized (Billing → Contracts)**

**Endpoint:** POST /webhooks/billing/finalized

**Summary :\**
Triggered by Billing Service when final invoices/credits are computed
after contract end. Contracts Service records billing results and the
frontend can reflect them inside contract summary/detail screens. This
endpoint ensures the end-of-contract state is financially complete.

**Auth:** JWT required (per requirement for this documentation).

**Request Body (example)**

  -----------------------------------------------------------------------
  {\
  \"contractId\": \"c1\",\
  \"invoiceId\": \"INV-12345\",\
  \"finalAmount\": 1200.0,\
  \"creditApplied\": 100.0\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"contractId\": \"c1\",\
  \"status\": \"billing updated\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/webhooks/billing/finalized\`, {\
  method: \"POST\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Authorization\": \`Bearer \${token}\`\
  },\
  body: JSON.stringify({\
  contractId: \"c1\",\
  invoiceId: \"INV-12345\",\
  finalAmount: 1200.0,\
  creditApplied: 100.0\
  })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8.2 Planned Endpoints (Docs Only)**

### **8.2.1 Dispute a Contract (Planned)**

**Endpoint:** PUT /contracts/:id/dispute

**Summary :\**
Marks a contract as **disputed** when either party disputes hours,
payments, or deliverables. When disputed, billing should pause and time
tracking should lock until support/admin resolves it. This is documented
as an edge case and requires adding the DISPUTED status into enums and
wiring the controller/service.

**Auth:** JWT required.

**Request Body**

  -----------------------------------------------------------------------
  {\
  \"reason\": \"hours not approved\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Response Body (example)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"c1\",\
  \"status\": \"disputed\",\
  \"reason\": \"hours not approved\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Copy-pastable Example (fetch)**

  -----------------------------------------------------------------------
  await fetch(\`\${BASE_URL}/contracts/c1/dispute\`, {\
  method: \"PUT\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  \"Authorization\": \`Bearer \${token}\`\
  },\
  body: JSON.stringify({ reason: \"hours not approved\" })\
  });
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **9. UI Design Alignment Notes**

Based on the frontend integration documentation, screen-to-API mapping
is:

- Hire Me screen → POST /contract-groups

- End Contract screen → PUT /contracts/:id/end

- Contract Summary → GET /contracts/:id

- Client Dashboard → GET /contracts/client/:id

- Talent Dashboard → GET /contracts/talent/:id
