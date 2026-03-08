**Google uses idToken but our backend is only accepting access_token.**\
\
Here\'s exactly what needs to change in the backend:

**1. Update the DTO**

In dto/google-login.dto.ts, rename the field if it\'s currently
accessToken to idToken:

export class GoogleLoginDto {

\@IsString() \@IsNotEmpty()

idToken: string;

}

**2. Fix the verification logic in google-auth.service.ts**

If it currently looks something like this (wrong):

// ❌ verifying an access_token

const response = await
fetch(\`https://www.googleapis.com/oauth2/v1/userinfo?access_token=\${accessToken}\`);

Replace it with this (correct):

// ✅ verifying an idToken

const response = await
fetch(\`https://oauth2.googleapis.com/tokeninfo?id_token=\${idToken}\`);

const payload = await response.json();

if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {

throw new UnauthorizedException(\'TOKEN_VERIFICATION_FAILED\');

}

const { email, sub, given_name, family_name, picture } = payload;

Or using the official library (more robust):

import { OAuth2Client } from \'google-auth-library\';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ticket = await client.verifyIdToken({

idToken,

audience: process.env.GOOGLE_CLIENT_ID,

});

const { email, sub, given_name, family_name, picture } =
ticket.getPayload();

**3. Install the library if going that route**

****cd apps/auth-service && npm install google-auth-library

**4. Update the controller** to pass idToken instead of accessToken
through to the service.

The google-auth-library approach is the safer option --- it handles
token expiry, signature verification, and audience checking
automatically rather than relying solely on the tokeninfo endpoint.
