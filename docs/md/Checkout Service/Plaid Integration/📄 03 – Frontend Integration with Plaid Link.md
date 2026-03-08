# **📄 03 -- Frontend Integration with Plaid Link**

### **📌 Purpose**

This document explains how to integrate **Plaid Link** into the frontend
of the Marketeq platform to securely collect and tokenize bank account
info for ACH payments. It is built to support instant account
verification and bank-based checkout. All data will be passed to the
plaid-service via API.

### **📁 Folder/File Structure**

You must add the following frontend logic inside your Next.js or React
application.

app/

└── components/

└── plaid/

├── PlaidLinkButton.tsx

└── plaid-utils.ts



### **🔑 Prerequisites**

Before integrating:

1.  Your backend (plaid-service) should have the /create-link-token and
    /exchange-public-token endpoints functional.

2.  You must install the official Plaid SDK:

npm install react-plaid-link



### **🧩 Component: PlaidLinkButton.tsx**

****// app/components/plaid/PlaidLinkButton.tsx

import { usePlaidLink } from \'react-plaid-link\';

import { useEffect, useState } from \'react\';

import axios from \'axios\';

export default function PlaidLinkButton({ onSuccess }: { onSuccess:
(data: any) =\> void }) {

const \[linkToken, setLinkToken\] = useState\<string \| null\>(null);

useEffect(() =\> {

axios.post(\'/api/plaid/create-link-token\').then((res) =\> {

setLinkToken(res.data.link_token);

});

}, \[\]);

const config = {

token: linkToken!,

onSuccess: async (public_token: string, metadata: any) =\> {

const exchange = await axios.post(\'/api/plaid/exchange-token\', {

public_token,

metadata,

});

onSuccess(exchange.data); // Contains access_token, account_id, etc.

},

onExit: (err: any, metadata: any) =\> {

console.warn(\'Plaid exited\', err, metadata);

},

};

const { open, ready } = usePlaidLink(config);

return (

\<button onClick={() =\> open()} disabled={!ready}\>

Link Bank Account

\</button\>

);

}



### **🔧 Util: plaid-utils.ts**

****// app/components/plaid/plaid-utils.ts

export const isPlaidAccountLinked = (metadata: any): boolean =\> {

return metadata && metadata.account && metadata.account.name;

};



### **📤 API Route: /api/plaid/create-link-token.ts**

This frontend route proxies the backend Plaid service.

// pages/api/plaid/create-link-token.ts

import type { NextApiRequest, NextApiResponse } from \'next\';

import axios from \'axios\';

export default async function handler(req: NextApiRequest, res:
NextApiResponse) {

const response = await
axios.post(\`\${process.env.PLAID_SERVICE_URL}/plaid/create-link-token\`,
{

userId: req.headers\[\'x-user-id\'\],

});

res.status(200).json(response.data);

}



### **📤 API Route: /api/plaid/exchange-token.ts**

****// pages/api/plaid/exchange-token.ts

import type { NextApiRequest, NextApiResponse } from \'next\';

import axios from \'axios\';

export default async function handler(req: NextApiRequest, res:
NextApiResponse) {

const { public_token, metadata } = req.body;

const response = await
axios.post(\`\${process.env.PLAID_SERVICE_URL}/plaid/exchange-token\`, {

public_token,

metadata,

userId: req.headers\[\'x-user-id\'\],

});

res.status(200).json(response.data);

}



### **✅ Success Payload Returned to Frontend**

****{

access_token: \'plaid-sandbox-xxx\',

account_id: \'account-id-xxx\',

bank_name: \'Chase\',

account_last4: \'1234\',

account_type: \'checking\'

}

This data should be passed to your checkout-service for storage and
payment setup.

### **🔐 Security Notes**

- All requests must be authenticated via your session/token middleware.

- Never store the public_token. Only access_token and account_id are
  used for ACH.

- The access_token is stored securely in the backend (plaid-service)
  only.
