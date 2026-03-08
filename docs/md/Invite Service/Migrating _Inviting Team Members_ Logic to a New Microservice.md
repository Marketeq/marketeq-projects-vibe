# **Migrating \"User Invitation\" Logic to a New Microservice in NestJS on Render**

### **Overview**

This document provides step-by-step instructions to **move the user
invitation logic** from the **onboarding screen** to a new **User
Invitation Service microservice** using **NestJS with TypeScript**. We
will expose the necessary **API endpoints** for user invitations and
update the existing **onboarding code** to communicate with the new
service hosted on **Render**.

### **Step 1: Create the New User Invitation Microservice**

1.  **Create a New NestJS Project for the User Invitation Service**:

    - Start by creating a **new NestJS project** for the **User
      Invitation Service**.

nest new user-invitation-service

2.  \
    **Install Dependencies**:

    - If you need any extra dependencies (e.g., for sending emails),
      install them here. For example, using **Nodemailer** for sending
      emails:

npm install nodemailer

3.  \
    **Create the Invitation Service**:

    - Inside the **microservice**, create a new **service** to handle
      user invitation logic, including sending invitation emails and
      storing invitations in the database.

4.  **Example (NestJS Service)**:

import { Injectable } from \'@nestjs/common\';

import \* as nodemailer from \'nodemailer\';

\@Injectable()

export class UserInvitationService {

// Method to send an invitation email

async sendInvitation(email: string, role: string): Promise\<string\> {

// Configure nodemailer transport

const transporter = nodemailer.createTransport({

service: \'gmail\',

auth: {

user: \'your-email@gmail.com\',

pass: \'your-email-password\', // Use environment variables for security

},

});

// Send email

await transporter.sendMail({

from: \'\"Your App\" \<your-email@gmail.com\>\',

to: email,

subject: \'You\\\'ve been invited!\',

text: \`You have been invited as a \${role}.\`,

});

return \`Invitation sent to \${email} for role \${role}\`;

}

// Method to store invitation in the database (optional)

storeInvitation(email: string, role: string): string {

// Database logic here to store the invitation (e.g., save to MongoDB,
PostgreSQL, etc.)

console.log(\`Storing invitation for \${email}\`);

return \`Invitation for \${email} stored\`;

}

}

5.  \
    **Create the Invitation Controller**:

    - Create a controller to expose the necessary **API endpoints** for
      inviting users.

6.  **Example (NestJS Controller)**:

import { Controller, Post, Body } from \'@nestjs/common\';

import { UserInvitationService } from \'./user-invitation.service\';

\@Controller(\'api/invite\')

export class UserInvitationController {

constructor(private readonly userInvitationService:
UserInvitationService) {}

\@Post()

inviteUser(@Body() inviteData: { email: string; role: string }) {

const { email, role } = inviteData;

// Send invitation and store in the database

const emailResponse = this.userInvitationService.sendInvitation(email,
role);

const storeResponse = this.userInvitationService.storeInvitation(email,
role);

return { emailResponse, storeResponse };

}

}

7.  \
    **Run the Microservice**:

    - Once the service and controller are in place, start the
      microservice:

npm run start

8.  \
    Your **User Invitation Microservice** should now be running on
    http://localhost:3000 (or the port you\'ve configured).

### **Step 2: Deploy the Microservice to Render**

Now that the **User Invitation Service** is set up, you need to deploy
it to **Render**.

1.  **Push the Service to GitHub**:

    - If you haven\'t already, initialize a **GitHub repository** for
      your **User Invitation Service** and push your local NestJS
      project to this repository.

git init

git remote add origin \<your-repo-url\>

git add .

git commit -m \"Initial commit\"

git push -u origin main

2.  \
    **Link the GitHub Repository to Render**:

    - **Log in to Render** and go to your **Render dashboard**.

    - Click on the **\"New Web Service\"** button and choose **GitHub**
      as the source.

    - Select the **User Invitation Service repository** from your GitHub
      account.

    - Render will automatically build and deploy your service.

3.  **Configure the Render Service**:

    - When deploying, Render will automatically detect that it\'s a
      **Node.js** (NestJS) application.

    - Ensure that the **Render** settings are correctly configured
      (e.g., the **port number** and any **environment variables**).

4.  **Set Up Environment Variables**:

    - You may need to configure environment variables for the **email
      service** (e.g., Gmail credentials) in the **Render dashboard**
      under **Environment** settings.

    - Example:

EMAIL_USER=your-email@gmail.com

EMAIL_PASS=your-email-password

5.  \
    **Deploy and Access Your Service**:

    - After the deployment is complete, **Render** will provide a
      **URL** for your live **User Invitation Service** (e.g.,
      https://your-app-name.onrender.com).

    - Test the endpoint to ensure it's working:
      https://your-app-name.onrender.com/api/invite.

### **Step 3: Update the Onboarding Code to Use the New Microservice**

1.  **Update the Onboarding Form to Call the User Invitation Service**:

    - In the **onboarding screen** (e.g., Next.js/TypeScript), update
      the frontend code to **call the new User Invitation Service API**
      instead of handling invitations internally.

2.  **Example (Next.js / TypeScript)**:

import { useState } from \'react\';

const InviteUser = () =\> {

const \[email, setEmail\] = useState(\'\');

const \[role, setRole\] = useState(\'\');

const handleInvite = async () =\> {

try {

const response = await
fetch(\'https://your-app-name.onrender.com/api/invite\', {

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

},

body: JSON.stringify({ email, role }),

});

const data = await response.json();

console.log(data);

alert(\'Invitation sent successfully!\');

} catch (error) {

console.error(\'Error inviting user:\', error);

}

};

return (

\<div\>

\<h2\>Invite User\</h2\>

\<input

type=\"email\"

placeholder=\"Enter email\"

value={email}

onChange={(e) =\> setEmail(e.target.value)}

/\>

\<input

type=\"text\"

placeholder=\"Enter role\"

value={role}

onChange={(e) =\> setRole(e.target.value)}

/\>

\<button onClick={handleInvite}\>Send Invitation\</button\>

\</div\>

);

};

export default InviteUser;

- \
  **Explanation**:

  - The frontend now makes a **POST request** to
    https://your-app-name.onrender.com/api/invite with **email** and
    **role** data.

  - The backend (User Invitation Service) processes the data, sends an
    email, and stores the invitation in the database.

3.  **Environment Variables**:

    - Make sure to **update the API URL** in your **.env** file to point
      to the **User Invitation Service** deployed on **Render**.

4.  Example:

USER_INVITE_API_URL=https://your-app-name.onrender.com/api/invite \#
replace with your Render URL

> 

### **Step 4: Testing the Endpoints**

1.  **Test the Microservice**:

    - Use tools like **Postman** or **cURL** to test the **POST
      /api/invite** endpoint for inviting users.

2.  **Example cURL Command**:

curl -X POST https://your-app-name.onrender.com/api/invite -H
\"Content-Type: application/json\" -d \'{\"email\":
\"example@domain.com\", \"role\": \"Developer\"}\'

3.  \
    **Test the Frontend**:

    - Go to the **onboarding screen** and test if the **\"Send
      Invitation\"** button correctly calls the **User Invitation
      Service** and the invitation is sent and stored.

### **Step 5: Clean Up the Onboarding Folder**

1.  **Remove the Old Invitation Logic**:

    - Once the **user invitation logic** is moved to the microservice,
      ensure that all related **code** and **dependencies** in the
      onboarding flow are removed to avoid code duplication.

2.  **Ensure Proper Communication Between Microservice and Frontend**:

    - Ensure that the **frontend** is properly communicating with the
      **new User Invitation Service** and all user interactions are
      routed correctly.

### **Conclusion**

By following this guide, you will have successfully:

- Moved the **user invitation logic** to the **User Invitation Service
  microservice** hosted on **Render**.

- Exposed the necessary **API endpoints** for user invitations.

- Updated the **frontend onboarding code** to communicate with the new
  **microservice** on **Render**.

- Ensured that the solution is **scalable**, **maintainable**, and
  decoupled from the onboarding flow.
