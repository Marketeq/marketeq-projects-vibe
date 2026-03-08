## **Team Invitation Email Message for SendGrid**

### **Objective**

This document provides the **email message template** to be used for
sending **team invitations** via **SendGrid**. It includes placeholders
for **dynamic content** (e.g., recipient name, sender name, and
invitation link) that will be replaced at runtime.

### **Email Message Template**

#### **Subject Line:**

****You\'re invited to join \[Sender\'s First Name\]\'s team on
Marketeq Projects!

#### **Email Body:**

**Plain Text Version**:

Hi \[Recipient\'s First Name\],

\[Sender\'s First Name\] invited you to join their team on \*\*Marketeq
Projects\*\*, where you can collaborate, manage tasks, and track project
progress seamlessly.

Click below to join \[Sender\'s First Name\]\'s team on Marketeq
Projects:

\[Invitation Link\]

If you have any questions or need assistance, feel free to reach out to
\[Sender\'s First Name\] at \[Sender\'s Email Address\].

We\'re excited to have you on board!

Best regards,

The Marketeq Projects Team

**HTML Version**:

\<p\>Hi \[Recipient\'s First Name\],\</p\>

\<p\>\<strong\>\[Sender\'s First Name\]\</strong\> invited you to join
their team on \<strong\>Marketeq Projects\</strong\>, where you can
collaborate, manage tasks, and track project progress seamlessly.\</p\>

\<p\>Click below to join \<strong\>\[Sender\'s First
Name\]\</strong\>\'s team on Marketeq Projects:\</p\>

\<p\>\<a href=\"\[Invitation Link\]\"\>Join \[Sender\'s First Name\]\'s
Team\</a\>\</p\>

\<p\>If you have any questions or need assistance, feel free to reach
out to \<strong\>\[Sender\'s First Name\]\</strong\> at \<a
href=\"mailto:\[Sender\'s Email Address\]\"\>\[Sender\'s Email
Address\]\</a\>.\</p\>

\<p\>We\'re excited to have you on board!\</p\>

\<p\>Best regards,\</p\>

\<p\>The \<strong\>Marketeq Projects\</strong\> Team\</p\>

### **Dynamic Placeholders:**

- **\[Recipient\'s First Name\]**: The first name of the recipient
  (person being invited).

- **\[Sender\'s First Name\]**: The first name of the person sending the
  invitation.

- **\[Sender\'s Last Name\]**: The last name of the person sending the
  invitation.

- **\[Sender\'s Email Address\]**: The email address of the sender (used
  as the \"from\" address).

- **\[Invitation Link\]**: The dynamically generated invitation link
  (e.g., https://projects.marketeqdigital.com/invite/abc123xyz).

### **Integration with SendGrid:**

1.  **Email API Request**:\
    When sending the email through SendGrid, replace the placeholders
    with the appropriate dynamic content from your backend.

2.  **SendGrid API Example (Node.js)**:\
    Here\'s how the email message can be used within a SendGrid API
    request:

const sgMail = require(\'@sendgrid/mail\');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {

to: recipientEmail,

from: senderEmail,

subject: \`You\'re invited to join \${senderFirstName}\'s team on
Marketeq Projects!\`,

text: \`Hi \${recipientFirstName},\\n\\n\${senderFirstName} invited you
to join their team on Marketeq Projects\...\`,

html: \`\<p\>Hi
\${recipientFirstName},\</p\>\<p\>\<strong\>\${senderFirstName}\</strong\>
invited you to join their team on Marketeq Projects\...\</p\>\`,

};

sgMail.send(msg);

3.  \
    **SendGrid Dynamic Template (Optional)**:

    - You can also create a **dynamic SendGrid template** and use
      SendGrid's substitution tags to replace placeholders like
      \[Recipient\'s First Name\], \[Sender\'s First Name\], and
      \[Invitation Link\] during the API call.

    - Use **dynamic_template_data** to inject the values into the
      template:

const msg = {

to: recipientEmail,

from: senderEmail,

templateId: \'your-template-id\',

dynamic_template_data: {

recipientFirstName: recipientFirstName,

senderFirstName: senderFirstName,

senderLastName: senderLastName,

senderEmail: senderEmail,

invitationLink: invitationLink,

},

};



### **Final Notes:**

- Ensure that the **invitation link** is securely generated and passed
  into the email template dynamically.

- Double-check that all placeholders (\[Recipient\'s First Name\],
  \[Sender\'s First Name\], \[Invitation Link\], etc.) are correctly
  replaced at runtime.

- Test the email message to ensure all dynamic content is replaced as
  expected before sending it to users.
