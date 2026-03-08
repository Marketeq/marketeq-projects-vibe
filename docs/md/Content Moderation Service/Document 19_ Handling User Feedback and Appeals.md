### **Document 19: Handling User Feedback and Appeals**

#### **Overview:**

This document outlines how to handle **user feedback** and **appeals**
within the **Content Moderation Microservice**. If a project is rejected
by the automated content moderation system, the user will be notified
with the reasons for rejection. This document describes how to manage
the process of **user appeals**, allow users to **resubmit** their
projects, and track feedback effectively.

#### **1. Handling User Feedback**

When a project is **rejected** by the **Content Moderation
Microservice** due to failed content checks, the user will be notified
of the **rejection reason** and given an opportunity to make
corrections. This process ensures that users understand why their
content was rejected and provides actionable feedback to help them
adjust their submission.

##### **1.1. Notification of Rejection**

After a project fails content moderation, the system will send a
notification to the user with the following details:

- **Rejection message**: A clear explanation of the rejection reason
  (e.g., \"Profanity detected in the title\", \"Explicit content found
  in media\").

- **Suggested corrections**: Guidance on how to fix the issue (e.g.,
  \"Replace the inappropriate word in the title\", \"Upload a
  non-explicit image\").

##### **1.2. Example Rejection Notification**

****const rejectionMessage = \`Your project titled
\"\${project.title}\" has been rejected due to explicit content detected
in the image. Please replace the image with an appropriate one and
resubmit your project.\`;

await this.notificationService.sendNotification(project.userId,
rejectionMessage);

##### **1.3. Resubmission Process**

Once the user has received feedback, they can make the necessary
adjustments and **resubmit** their project. The system should
automatically validate the resubmitted content to ensure the changes
meet the platform's standards.

#### **2. User Appeals Process**

If a user believes that their project was wrongly rejected or flagged,
they can **appeal** the decision. This appeal process allows the user to
request a review from an **admin** or **appeals team**. The system
should allow users to submit an **appeal request**, and the appeal will
be reviewed manually by a moderator or admin.

##### **2.1. Submitting an Appeal**

To initiate an appeal, users should have the option to submit an appeal
request directly through the **UI**. The **UI** should provide a clear
path for submitting the appeal, along with instructions on how to
proceed.

##### **2.2. Example Appeal Submission UI (React)**

****import React, { useState } from \'react\';

const AppealForm = ({ projectId }) =\> {

const \[appealReason, setAppealReason\] = useState(\"\");

const submitAppeal = async () =\> {

const response = await fetch(\`/api/projects/appeal/\${projectId}\`, {

method: \"POST\",

body: JSON.stringify({ reason: appealReason }),

});

const result = await response.json();

alert(result.message);

};

return (

\<div\>

\<h3\>Appeal Submission\</h3\>

\<textarea

value={appealReason}

onChange={(e) =\> setAppealReason(e.target.value)}

placeholder=\"Explain why you believe this decision should be
overturned.\"

/\>

\<button onClick={submitAppeal}\>Submit Appeal\</button\>

\</div\>

);

};

export default AppealForm;

##### **2.3. Appeal Request Handler in Backend**

Once an appeal is submitted, it will be processed by the backend to
notify the **admin team** or **appeals moderators** for review.

import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class AppealService {

async submitAppeal(projectId: string, appealReason: string):
Promise\<any\> {

// Save appeal information to the database or flag it for manual review

await this.appealRepository.save({ projectId, appealReason });

// Notify the admin or appeals team about the new appeal

await this.notificationService.sendNotificationToAdmin(\'New appeal
submitted\', \`Project ID: \${projectId} requires review. Reason:
\${appealReason}\`);

return { message: \'Your appeal has been submitted successfully.\' };

}

}



#### **3. Reviewing the Appeal**

Once the appeal is submitted, a **manual review** should occur. This
review should be carried out by a **moderator** or **admin team** to
determine if the rejection was valid.

##### **3.1. Appeal Decision**

Once the appeal has been reviewed, the **moderator** or **admin** will
make a decision:

- **Approve**: The project is approved and moved to the marketplace.

- **Reject**: The project is rejected again, and the user is notified.

- **Request Edits**: If the content is borderline, the moderator can
  request that the user edit and resubmit the content.

##### **3.2. Example Appeal Decision Handler**

****import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class AppealService {

async reviewAppeal(projectId: string, decision: string): Promise\<any\>
{

const project = await this.projectRepository.findOne(projectId);

switch (decision) {

case \'approve\':

// Approve the project

await this.projectRepository.update(projectId, { status: \'approved\'
});

await this.notificationService.sendNotification(project.userId, \'Your
appeal was successful. Your project is now approved.\');

break;

case \'reject\':

// Reject the project again

await this.projectRepository.update(projectId, { status: \'rejected\'
});

await this.notificationService.sendNotification(project.userId, \'Your
appeal was unsuccessful. Your project remains rejected.\');

break;

case \'request-edits\':

// Request edits

await this.projectRepository.update(projectId, { status:
\'pending-edits\' });

await this.notificationService.sendNotification(project.userId, \'Your
project requires edits before it can be approved.\');

break;

default:

throw new Error(\'Invalid decision\');

}

}

}



#### **4. Tracking Appeals**

All appeals should be tracked in a dedicated log or database table to
monitor how many appeals are submitted, their outcomes, and trends in
content rejection.

##### **4.1. Example Database Table for Appeals**

****CREATE TABLE appeals (

id SERIAL PRIMARY KEY,

project_id INT NOT NULL,

reason TEXT,

status VARCHAR(50), \-- \'pending\', \'approved\', \'rejected\'

moderator_comments TEXT,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

##### **4.2. Storing Appeal Decisions**

Each time an appeal is reviewed, the result will be stored in the
database to track the appeal status and moderator feedback.

async saveAppealDecision(projectId: string, status: string, comments:
string): Promise\<void\> {

const appeal = new Appeal();

appeal.projectId = projectId;

appeal.status = status;

appeal.moderatorComments = comments;

await this.appealRepository.save(appeal);

}



#### **5. Conclusion**

The **user feedback and appeals process** provides a robust way for
users to **appeal** rejected projects and ensure fair treatment. The
**Content Moderation Microservice** automatically handles moderation and
notifies users when their projects are rejected. In cases where the user
believes the decision was incorrect, they can submit an appeal, which is
reviewed by moderators or admins. The platform ensures that all feedback
and appeals are tracked for transparency and accountability.
