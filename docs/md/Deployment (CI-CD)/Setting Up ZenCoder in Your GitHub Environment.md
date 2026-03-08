## **Setting Up ZenCoder in Your GitHub Environment**

### **Overview:**

This document will walk you through the steps to set up Zen Code
(Zencoder) in your GitHub environment. Once set up, it will
automatically review pull requests and leave comments with identified
issues directly on GitHub.

### **Steps to Set Up Zen Code in GitHub:**

### **1. Sign Up for Zen Code:**

- Go to [[Zencoder]{.underline}](https://zencoder.ai) and sign up for an
  account.

- Choose the **Free Plan** (if you don't need advanced features) or the
  appropriate plan for your needs.

### **2. Authorize Zen Code to Access GitHub:**

- Log in to Zen Code.

- Go to your Zen Code dashboard and navigate to the **Integrations**
  section.

- Click on **Connect GitHub** and authorize Zen Code to access your
  GitHub account by following the prompts.

- **Permission Request**: Ensure Zen Code has access to the repositories
  you want it to monitor (you can select individual repositories or all
  repositories).

- Zen Code will now be connected to your GitHub account.

### **3. Set Up GitHub Webhook for Automated PR Reviews:**

- In your GitHub repository, go to **Settings \> Webhooks**.

- Click **Add webhook** and configure it as follows:

  - **Payload URL**: Enter the webhook URL provided by Zen Code in your
    account under integrations.

  - **Content Type**: Select **application/json**.

  - **Which events would you like to trigger this webhook?**: Choose
    **Pull requests** and **Push events**.

  - Click **Add webhook** to save the changes.

**Note**: This ensures Zen Code will trigger automatically on pull
requests and code pushes.

### **4. Configure Zen Code to Review Pull Requests:**

- Go to the **GitHub Settings** in Zen Code.

- Enable **Auto Review** for pull requests.

- Choose the following review criteria:

  - **Basic Review Criteria**: Include code readability, basic security
    checks, performance issues, etc.

  - **Notifications**: Set notifications to be posted directly on GitHub
    as comments under the pull request.

- Zen Code will automatically analyze new pull requests and post a
  comment on them with identified issues.

### **5. Final Test:**

- Create a test pull request in your GitHub repository.

- Zen Code should automatically review the pull request and post
  feedback as a comment.
