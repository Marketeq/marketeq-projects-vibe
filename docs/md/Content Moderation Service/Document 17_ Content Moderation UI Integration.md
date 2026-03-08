### **Document 17: Content Moderation UI Integration**

#### **Overview:**

This document outlines how to integrate **content moderation results**
into the **user interface (UI)**, ensuring that project owners and
admins are properly informed of content approval or rejection. It
describes how to integrate the **Content Moderation Microservice** with
the **front-end interface**, so users can see the results of content
validation and take appropriate actions (e.g., resubmitting content or
reviewing feedback).

This integration covers **project submissions**, **feedback
notifications**, and the **display of project statuses** on the
frontend.

#### **1. UI Integration Overview**

The **UI integration** for content moderation involves two key aspects:

- **Displaying content moderation results**: The status of content
  (approved, rejected, pending review) should be clearly shown to users.

- **Notifying users**: Users need to receive notifications when their
  content is flagged or rejected, along with actionable feedback to make
  changes.

##### **1.1. UI Components for Moderation Feedback**

The UI will include the following components:

- **Content Status Display**: A section showing whether a project has
  been approved or rejected.

- **Moderation Feedback**: Text feedback explaining the reason for
  rejection or flagging.

- **Resubmission Button**: If the project is rejected, the user will be
  able to edit and resubmit the project.

#### **2. Project Submission Status Display**

After a project is submitted, the **Listing Microservice** calls the
**Content Moderation Microservice** to validate the content. Based on
the response, the **frontend** will display the appropriate status.

##### **2.1. Example UI Flow**

- **Project Approved**: If the content passes validation, the project is
  published and the user sees a **\"Project successfully published\"**
  message.

- **Project Rejected**: If the content fails moderation (e.g., profanity
  detected, explicit media), the user will be notified with **\"Your
  project has been rejected\"** and provided with feedback.

- **Pending Review**: If the project is under review (e.g., media
  requires further inspection), the user sees a **\"Your project is
  under review\"** message.

##### **2.2. UI Code Example**

****import React, { useEffect, useState } from \'react\';

const ProjectStatus = ({ projectId }) =\> {

const \[status, setStatus\] = useState(null);

const \[feedback, setFeedback\] = useState(\"\");

useEffect(() =\> {

async function fetchProjectStatus() {

const response = await fetch(\`/api/projects/status/\${projectId}\`);

const data = await response.json();

setStatus(data.status);

setFeedback(data.message);

}

fetchProjectStatus();

}, \[projectId\]);

if (status === \'approved\') {

return (

\<div\>

\<h2\>Project Published!\</h2\>

\<p\>{feedback}\</p\>

\</div\>

);

}

if (status === \'rejected\') {

return (

\<div\>

\<h2\>Your project has been rejected.\</h2\>

\<p\>{feedback}\</p\>

\<button onClick={() =\> resubmitProject()}\>Edit and
Resubmit\</button\>

\</div\>

);

}

return (

\<div\>

\<h2\>Your project is under review.\</h2\>

\<p\>{feedback}\</p\>

\</div\>

);

}

export default ProjectStatus;



#### **3. Notification System**

Notifications are an important part of the user experience, ensuring
that users are immediately informed about the results of content
moderation.

##### **3.1. Push Notification on Project Rejection**

If a project is rejected, the **Notification Service** will send an
immediate push notification to the user, informing them of the failure
and providing the feedback.

##### **3.2. Example Notification Payload**

****const notificationPayload = {

userId: projectOwnerId,

title: \"Project Rejected\",

message: \"Your project was rejected due to explicit content. Please
review and update your project.\",

link: \`/projects/\${projectId}\`, // Link to the project for review

};

await
this.notificationService.sendPushNotification(notificationPayload);

##### **3.3. Displaying Notifications in the UI**

Notifications will be displayed in the user's inbox or alert system.

import React, { useState, useEffect } from \'react\';

const Notifications = () =\> {

const \[notifications, setNotifications\] = useState(\[\]);

useEffect(() =\> {

async function fetchNotifications() {

const response = await fetch(\'/api/notifications\');

const data = await response.json();

setNotifications(data);

}

fetchNotifications();

}, \[\]);

return (

\<div\>

\<h3\>Notifications\</h3\>

{notifications.map((notification) =\> (

\<div key={notification.id}\>

\<h4\>{notification.title}\</h4\>

\<p\>{notification.message}\</p\>

\</div\>

))}

\</div\>

);

};

export default Notifications;



#### **4. Feedback for Content Rejections**

The **Feedback System** allows users to view detailed reasons for their
project rejection or flagging. This feedback will be provided by the
**Content Moderation Microservice** and passed to the frontend for
display.

##### **4.1. Example Feedback on Rejection**

****const rejectionFeedback = \[

\"Profanity detected in the project title\",

\"Inappropriate media detected (nudity)\",

\];

const Feedback = ({ feedback }) =\> {

return (

\<div\>

\<h3\>Moderation Feedback:\</h3\>

\<ul\>

{feedback.map((item, index) =\> (

\<li key={index}\>{item}\</li\>

))}

\</ul\>

\</div\>

);

};

export default Feedback;



#### **5. Conclusion**

This document outlines the integration of **content moderation results**
into the **user interface (UI)**, ensuring that **project owners** and
**admins** can view the status of their projects, receive feedback, and
take appropriate actions. The **Listing Microservice** handles content
submission and validation, while the **Notification Service** informs
users of the results. The UI components provided enable users to review
rejection reasons, edit content, and resubmit it.
