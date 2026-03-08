### **Document 12: Project Moderation and Notification Flow**

#### **Overview:**

This document outlines the **Project Moderation and Notification Flow**,
focusing on how **content moderation** is handled, how **notifications**
are sent to the user, and how the user is responsible for making changes
if their project doesn't pass content moderation. The **Content
Moderation Microservice** handles automatic content checks, and if a
project fails, the user is notified and provided with feedback to make
corrections.

#### **1. Project Moderation Process**

##### **1.1. Automatic Moderation**

Once a project is submitted through the **Listing Microservice**, the
**Content Moderation Microservice** will perform the following checks:

- **Text validation**: Title, description, tags, and skills are checked
  for **profanity**, **banned keywords**, and **length**.

- **Media validation**: Images and videos are analyzed for **explicit
  content** using **Hugging Face models** or other media moderation
  tools.

If the project fails any moderation checks, it will be flagged, and the
user will be immediately notified.

#### **2. Handling Failed Content Moderation**

If the **Content Moderation Microservice** determines that the project
does not comply with the platform's content policies, it is **not
approved** for publishing. Instead, the system follows these steps:

##### **2.1. User Notification**

The **user is immediately notified** of the failure via both:

1.  **Email**: Sent to the project owner's registered email address.

2.  **In-app notification**: A notification within the platform to alert
    the user.

**Notification Content**:

- A clear message explaining the reason for rejection (e.g., profanity
  detected, explicit media detected).

- A request for the user to edit and resubmit the project.

##### **2.2. Example Notification Message**

- **Email Message**:

  - *Subject*: \"Your Project Submission Needs Updates\"

  - *Body*: \"Your project titled \'Build a new website for a client\'
    has not been approved due to content violations. Please review the
    feedback provided below and make necessary changes to comply with
    our community guidelines.\"

- **In-app Notification**:

  - *Message*: \"Your project titled \'Build a new website for a
    client\' was rejected due to explicit content in the media. Please
    update the project and resubmit for approval.\"

#### **3. Steps for User Resubmission**

Once the user has been notified, they can make the necessary changes:

1.  **Review feedback**: The system will provide feedback on what failed
    the moderation checks (e.g., \"Your project title contains banned
    keywords\").

2.  **Edit content**: The user is responsible for editing the project's
    text fields or media content to meet platform guidelines.

3.  **Resubmit the project**: Once the user has made the necessary
    changes, they can resubmit the project for another round of
    automated moderation.

##### **3.1. Example Resubmission Flow**

****async handleProjectResubmission(projectId: string, updatedProject:
any) {

// Update project with the edited fields

await this.projectRepository.update(projectId, updatedProject);

// Revalidate project content

const validationResponse = await
this.projectService.validateProjectContent(updatedProject);

if (validationResponse.status === \'approved\') {

// Mark the project as approved

await this.projectRepository.save({ projectId, status: \'approved\' });

return { status: \'approved\', message: \'Project successfully
resubmitted and approved.\' };

}

// If still fails validation, send rejection message

return { status: \'rejected\', message: \'Project still fails content
moderation.\' };

}



#### **4. Content Moderation Feedback Example**

The **content feedback** to the user will clearly outline what needs to
be changed. For example:

- **Failed Field: Title\**

  - *Reason*: \"The title contains inappropriate language (e.g.,
    \'badword\').\"

  - *Action*: \"Please replace the title with a suitable alternative.\"

- **Failed Field: Media (Image)\**

  - *Reason*: \"The uploaded image contains explicit content.\"

  - *Action*: \"Please upload a different image that complies with our
    guidelines.\"

#### **5. Final Status and Resubmission Logic**

Once the user makes the necessary changes and resubmits the project:

- If the project passes all checks, it is **approved** and published to
  the marketplace.

- If it fails again, the user is notified of the reasons for failure and
  can continue editing.

#### **6. Conclusion**

In this updated **Project Moderation and Notification Flow**, the
process for handling failed moderation is clear: the user receives
immediate feedback, is notified via email and in-app messages, and is
given the opportunity to make changes and resubmit their project. The
manual review process is replaced by a self-service **correction flow**
where the user is responsible for making necessary changes to ensure
their project complies with platform guidelines.
