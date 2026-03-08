# **1) SQL seed for testing**

> Assumes existing tables: teams, users, team_members, and the new
> invitations. Adjust IDs/emails as needed.

\-- Clean slate (safe for local/dev)

DELETE FROM invitations;

DELETE FROM team_members WHERE team_id IN
(\'11111111-1111-1111-1111-111111111111\');

DELETE FROM users WHERE id IN
(\'22222222-2222-2222-2222-222222222222\',\'33333333-3333-3333-3333-333333333333\');

DELETE FROM teams WHERE id IN
(\'11111111-1111-1111-1111-111111111111\');

\-- Team

INSERT INTO teams (id, name, created_at, updated_at)

VALUES (\'11111111-1111-1111-1111-111111111111\', \'Acme Client\',
now(), now());

\-- Users (creator and invitee)

INSERT INTO users (id, email, first_name, last_name, created_at,
updated_at)

VALUES

(\'22222222-2222-2222-2222-222222222222\', \'owner@acme.com\',
\'Olivia\', \'Owner\', now(), now()),

(\'33333333-3333-3333-3333-333333333333\', \'new.member@acme.com\',
\'New\', \'Member\', now(), now());

\-- Owner is already a team member (admin)

INSERT INTO team_members (team_id, user_id, role, created_at)

VALUES (\'11111111-1111-1111-1111-111111111111\',
\'22222222-2222-2222-2222-222222222222\', \'admin\', now());

\-- Pending invitation for new.member@acme.com (7-day expiry)

INSERT INTO invitations (

id, team_id, invited_email, role, status, token, expires_at,
created_by_user_id, created_at, updated_at, resent_count

) VALUES (

gen_random_uuid(),

\'11111111-1111-1111-1111-111111111111\',

\'new.member@acme.com\',

\'editor\',

\'pending\',

\'dev-test-token-abc123\', \-- replace with random in real tests

now() + interval \'7 day\',

\'22222222-2222-2222-2222-222222222222\',

now(), now(),

0

);

\-- Optional: accepted invitation example

\-- INSERT INTO invitations (

\-- id, team_id, invited_email, role, status, token, expires_at,
created_by_user_id, created_at, updated_at, accepted_at, resent_count

\-- ) VALUES (

\-- gen_random_uuid(),

\-- \'11111111-1111-1111-1111-111111111111\',

\-- \'accepted.user@acme.com\',

\-- \'viewer\',

\-- \'accepted\',

\-- \'unused-token\',

\-- now() + interval \'7 day\',

\-- \'22222222-2222-2222-2222-222222222222\',

\-- now(), now(),

\-- now(),

\-- 1

\-- );



# **2) Postman collection (v2.1)**

> Includes variables and the required gateway headers (x-user-id,
> x-user-email). Import this JSON directly into Postman.

{

\"info\": {

\"name\": \"Invitations Service\",

\"\_postman_id\": \"f7b5e8c0-aaaa-bbbb-cccc-ddddeeeeffff\",

\"description\": \"Postman collection for Invitations Service
endpoints.\",

\"schema\":
\"https://schema.getpostman.com/json/collection/v2.1.0/collection.json\"

},

\"item\": \[

{

\"name\": \"Health\",

\"request\": {

\"method\": \"GET\",

\"header\": \[\],

\"url\": \"{{baseUrl}}/health\"

}

},

{

\"name\": \"Create Invites (POST /invitations)\",

\"request\": {

\"method\": \"POST\",

\"header\": \[

{ \"key\": \"Content-Type\", \"value\": \"application/json\" },

{ \"key\": \"x-user-id\", \"value\": \"{{userId}}\" },

{ \"key\": \"x-user-email\", \"value\": \"{{userEmail}}\" }

\],

\"body\": {

\"mode\": \"raw\",

\"raw\": \"{\\n \\\"teamId\\\":
\\\"11111111-1111-1111-1111-111111111111\\\",\\n \\\"role\\\":
\\\"editor\\\",\\n \\\"emails\\\": \[\\\"new.member@acme.com\\\",
\\\"another.invitee@acme.com\\\"\],\\n \\\"note\\\": \\\"Welcome to
Acme!\\\"\\n}\"

},

\"url\": \"{{baseUrl}}/invitations\"

}

},

{

\"name\": \"List Invites (GET /invitations)\",

\"request\": {

\"method\": \"GET\",

\"header\": \[

{ \"key\": \"x-user-id\", \"value\": \"{{userId}}\" },

{ \"key\": \"x-user-email\", \"value\": \"{{userEmail}}\" }

\],

\"url\": {

\"raw\":
\"{{baseUrl}}/invitations?teamId=11111111-1111-1111-1111-111111111111&status=pending&limit=25\",

\"host\": \[\"{{baseUrl}}\"\],

\"path\": \[\"invitations\"\],

\"query\": \[

{ \"key\": \"teamId\", \"value\":
\"11111111-1111-1111-1111-111111111111\" },

{ \"key\": \"status\", \"value\": \"pending\" },

{ \"key\": \"limit\", \"value\": \"25\" }

\]

}

}

},

{

\"name\": \"Get One Invite (GET /invitations/:id)\",

\"request\": {

\"method\": \"GET\",

\"header\": \[

{ \"key\": \"x-user-id\", \"value\": \"{{userId}}\" },

{ \"key\": \"x-user-email\", \"value\": \"{{userEmail}}\" }

\],

\"url\": \"{{baseUrl}}/invitations/{{invitationId}}\"

}

},

{

\"name\": \"Resend Invite (POST /invitations/:id/resend)\",

\"request\": {

\"method\": \"POST\",

\"header\": \[

{ \"key\": \"x-user-id\", \"value\": \"{{userId}}\" },

{ \"key\": \"x-user-email\", \"value\": \"{{userEmail}}\" }

\],

\"url\": \"{{baseUrl}}/invitations/{{invitationId}}/resend\"

}

},

{

\"name\": \"Cancel Invite (DELETE /invitations/:id/cancel)\",

\"request\": {

\"method\": \"DELETE\",

\"header\": \[

{ \"key\": \"x-user-id\", \"value\": \"{{userId}}\" },

{ \"key\": \"x-user-email\", \"value\": \"{{userEmail}}\" }

\],

\"url\": \"{{baseUrl}}/invitations/{{invitationId}}/cancel\"

}

},

{

\"name\": \"Accept Invite (POST /invitations/accept)\",

\"request\": {

\"method\": \"POST\",

\"header\": \[

{ \"key\": \"Content-Type\", \"value\": \"application/json\" },

{ \"key\": \"x-user-id\", \"value\": \"{{inviteeUserId}}\" },

{ \"key\": \"x-user-email\", \"value\": \"{{inviteeEmail}}\" }

\],

\"body\": {

\"mode\": \"raw\",

\"raw\": \"{\\n \\\"token\\\": \\\"dev-test-token-abc123\\\"\\n}\"

},

\"url\": \"{{baseUrl}}/invitations/accept\"

}

}

\],

\"event\": \[\],

\"variable\": \[

{ \"key\": \"baseUrl\", \"value\":
\"https://your-invitations-service.onrender.com\" },

{ \"key\": \"userId\", \"value\":
\"22222222-2222-2222-2222-222222222222\" },

{ \"key\": \"userEmail\", \"value\": \"owner@acme.com\" },

{ \"key\": \"invitationId\", \"value\": \"\" },

{ \"key\": \"inviteeUserId\", \"value\":
\"33333333-3333-3333-3333-333333333333\" },

{ \"key\": \"inviteeEmail\", \"value\": \"new.member@acme.com\" }

\]

}

**How to use the collection:**

1.  Import JSON into Postman.

2.  Set baseUrl to your Render URL (or API Gateway URL if routed through
    it).

3.  After calling **Create Invites**, copy an id from the response into
    invitationId variable.

4.  To test **Accept**, ensure the invite token in DB matches the token
    you pass (e.g., dev-test-token-abc123) and that the x-user-email
    equals the invited_email in the invite.
