> **Implement these 3 fixes to get login working again:**

1.  **main.ts** -- CORS must include:

app.enableCors({

origin: \'https://marketeq-projects.vercel.app\',

credentials: true,

});

2.  **auth.controller.ts** -- After login, use:

res.cookie(\'accessToken\', token, {

httpOnly: true,

secure: true,

sameSite: \'None\',

domain: process.env.NODE_ENV === \'production\' ?
\'marketeq-projects.vercel.app\' : undefined,

path: \'/\',

});

3.  **Frontend** -- Every fetch to the backend **must** include:

credentials: \'include\'


