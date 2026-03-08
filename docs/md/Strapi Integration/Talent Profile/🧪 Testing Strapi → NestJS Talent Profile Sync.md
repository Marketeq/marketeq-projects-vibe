# **🧪 Testing Strapi → NestJS Talent Profile Sync**

## **1. Test the Webhook URL**

### **1.1 Generate a Fake Payload**

Create a file body.json:

{

\"event\": \"entry.update\",

\"model\": \"api::talent-profile.talent-profile\",

\"entry\": {

\"id\": 123,

\"attributes\": {

\"username\": \"dheerajnagdali\",

\"name\": \"Dheeraj\",

\"role\": \"Expert React Developer\",

\"yearsExperience\": 10,

\"locationCity\": \"Nainital\",

\"locationRegion\": \"Uttarakhand\",

\"locationCountry\": \"India\",

\"timeZone\": \"UTC+5:30\",

\"availableForHire\": true,

\"availabilityHoursPerWeek\": 40,

\"rate_min\": 85,

\"rate_max\": 120,

\"rating\": 4.5,

\"reviewCount\": 24,

\"memberSince\": \"2024-09-19\",

\"repeatHirePercent\": 85,

\"avgResponseTimeHours\": 1,

\"skills\": \[\"TypeScript\",\"React.js\",\"Tailwind
CSS\",\"Next.js\"\],

\"languages\": \[\"English\",\"Hindi\"\],

\"overview\": \"Frontend + accessibility\...\"

}

}

}

### **1.2 Compute the Signature**

Strapi signs the **raw body** with HMAC SHA-256.

Run:

SIG=\$(node -e \"const fs=require(\'fs\');const
c=fs.readFileSync(\'body.json\');const crypto=require(\'crypto\');const
sig=crypto.createHmac(\'sha256\',
process.env.STRAPI_WEBHOOK_SECRET\|\|\'your-secret\').update(c).digest(\'hex\');console.log(sig);\")

### **1.3 Send the Webhook**

****curl -X POST \\

-H \"Content-Type: application/json\" \\

-H \"x-strapi-signature: \$SIG\" \\

\--data-binary \@body.json \\

http://localhost:3001/strapi-sync/talent-profiles

**Expected response:**

****{ \"status\": \"upserted\", \"id\": 1, \"externalId\": \"123\" }



## **2. Verify Database Entry**

Open psql (or your PG client):

SELECT \* FROM talent_profiles WHERE external_id = \'123\';

Check that:

- username = \'dheerajnagdali\'

- skills contains \[\"TypeScript\",\"React.js\",\"Tailwind
  CSS\",\"Next.js\"\]

- rating = 4.5

## **3. Test Delete Event**

Change payload event to \"entry.delete\":

{

\"event\": \"entry.delete\",

\"model\": \"api::talent-profile.talent-profile\",

\"entry\": { \"id\": 123 }

}

Send again with valid signature.\
Expected response:

{ \"status\": \"deleted\", \"externalId\": \"123\" }

DB should no longer have the row.

## **4. Test Reconcile Service**

If you added the reconcile service:

1.  Temporarily expose an endpoint in reconcile.service.ts (e.g.
    /admin/reconcile/talent-profiles).

2.  Hit it manually:

curl -X POST http://localhost:3001/admin/reconcile/talent-profiles \\

-H \"Authorization: Bearer your-internal-token\"

3.  \
    Service should:

    - Call Strapi REST API

    - Upsert all entries

**Check logs**: "Reconcile complete. Upserted X entries."

## **5. Unit Tests (Optional)**

Inside test/strapi-sync.e2e-spec.ts:

it(\'should upsert profile from webhook\', async () =\> {

const payload = { event: \'entry.update\', entry: { id: 999, attributes:
{ username: \'test\' } } };

const res = await request(app.getHttpServer())

.post(\'/strapi-sync/talent-profiles\')

.set(\'x-strapi-signature\', validSignature(payload))

.send(payload);

expect(res.status).toBe(201);

});



## **🔑 Key Things to Validate**

1.  **Signature check** rejects bad requests (401 Invalid signature).

2.  **Upsert** updates existing rows, doesn't duplicate.

3.  **Delete** removes the correct row by externalId.

4.  **Reconcile** works even if a webhook was missed.

5.  **Frontend** queries return the synced data (via
    /public/talent/:username).
