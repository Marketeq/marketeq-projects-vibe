### **✅ Invite Window Implementation**

**1. Multiple Email Invitation Handling:**

- Implement logic to parse and validate multiple emails entered
  simultaneously.

- Emails should be parsed correctly when separated by commas or spaces.

- Invalid emails should be visually marked with immediate feedback.

**Frontend Validation Example (React):**

****const validateEmails = (input: string): string\[\] =\> {

const emails = input.split(/\[\\s,\]+/).filter(Boolean);

const invalidEmails = emails.filter(email =\>
!email.match(/\^\[\^@\\s\]+@\[\^@\\s\]+\\.\[\^@\\s\]+\$/));

return invalidEmails;

};



**2. Invite Roles & Permissions:**

- Allow users to select a role (**Viewer** or **Editor**) for each
  invited user.

- Store this role clearly in the invites database table (already
  defined).

**Updated Frontend Component Snippet:**

****\<select value={role} onChange={(e) =\> setRole(e.target.value)}\>

\<option value=\"Viewer\"\>Viewer\</option\>

\<option value=\"Editor\"\>Editor\</option\>

\</select\>



**3. Invite Settings Management (Advanced Settings Panel):**

- Clearly implement toggles and settings for:

  - **User Tracking\**

  - **Guest Sharing\**

  - **Who Has Access\**

  - **Link Expiration\**

  - **Link Password\**

**Example settings object (TypeScript):**

****interface InviteSettings {

userTracking: boolean;

embedCode: boolean;

guestSharing: boolean;

accessLevel: \'Anyone\' \| \'Only Invited\' \| \'Owner Only\';

linkExpiration: Date \| null;

linkPassword?: string;

}



**4. Link Expiration and Password Protection Logic:**

- Ensure backend logic correctly enforces link expiration and password
  protection.

**Backend logic snippet (NestJS):**

****async verifyInviteLink(inviteId: string, password?: string):
Promise\<boolean\> {

const invite = await this.inviteRepo.findOne({ where: { id: inviteId }
});

if (!invite \|\| new Date() \> invite.expires_at) return false;

if (invite.link_password && invite.link_password !== password) return
false;

return true;

}



**5. Invitation Resend and Removal Options:**

- Clearly implement backend endpoints to resend or remove invites.

**Backend example endpoints (NestJS):**

****\@Put(\'invites/:id/resend\')

async resendInvite(@Param(\'id\') id: string) {

// logic to resend the invite email

}

\@Delete(\'invites/:id\')

async removeInvite(@Param(\'id\') id: string) {

return this.inviteRepo.delete(id);

}



**6. Copy Link Functionality:**

- Implement the copy-to-clipboard functionality clearly on the frontend.

**React component snippet:**

****const copyToClipboard = (link: string) =\> {

navigator.clipboard.writeText(link);

alert(\'Invite link copied!\');

};

> 
