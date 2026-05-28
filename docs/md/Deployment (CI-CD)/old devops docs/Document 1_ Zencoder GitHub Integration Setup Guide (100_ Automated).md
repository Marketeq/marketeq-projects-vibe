## **Document 1: Zencoder GitHub Integration Setup Guide (100% Automated)**

### **Overview:**

This guide will walk you through integrating **Zencoder** with your
**GitHub repository** for **automated code reviews**. Once the
integration is complete, **Zencoder** will automatically trigger code
reviews every time a **pull request (PR)** is created. This setup works
seamlessly with **Render** as the deployment platform.

### **1. Prerequisites**

Before setting up the integration, ensure the following prerequisites
are met:

- **Zencoder account** and **API key**.

- **GitHub repository** where you want to integrate Zencoder.

- **GitHub Actions** enabled for your repository.

- **Render** as the deployment platform.

### **2. Get Zencoder API Key**

1.  **Generate Zencoder API Key**:

    - Log into your **Zencoder account**.

    - Navigate to the **API Settings** section.

    - Generate a new **API key**.

2.  **Store API Key in GitHub Secrets**:

    - Go to your **GitHub repository**.

    - Navigate to **Settings \> Secrets**.

    - Add a new secret named ZENCODER_API_KEY and paste the **API key**
      you generated into the value field.

    - This ensures secure access to Zencoder's API during the GitHub
      Actions workflow.

### **3. Create GitHub Action Workflow for Zencoder Review**

1.  **Create a GitHub Actions Workflow File**:

    - In your GitHub repository, navigate to the .github/workflows/
      directory. If this folder doesn't exist, create it.

    - Inside this folder, create a new file, e.g., zencoder-review.yml.

2.  **Define Workflow in zencoder-review.yml**:

    - This file will automatically trigger Zencoder to review every PR.

name: Zencoder Review

on:

pull_request:

branches:

\- main

\- development

\- feature/\*

jobs:

review:

runs-on: ubuntu-latest

steps:

\- name: Checkout code

uses: actions/checkout@v2

\- name: Trigger Zencoder Review

run: \|

curl -X POST https://zencoder.ai/api/review \\

-H \"Authorization: Bearer \${{ secrets.ZENCODER_API_KEY }}\" \\

-d \"repo=\${{ github.repository }}&branch=\${{ github.head_ref
}}&commit=\${{ github.sha }}\"

### **Explanation of the Workflow File:**

- **Trigger**: This workflow is triggered when a PR is created for
  branches like main, development, and any feature/\* branches.

- **Steps**:

  - **Checkout code**: The first step checks out the code of the PR.

  - **Trigger Zencoder Review**: This step sends a **POST request** to
    Zencoder's API, triggering a review of the code in the PR. The
    request contains:

    - **repo**: The GitHub repository URL.

    - **branch**: The branch where the PR was created.

    - **commit**: The commit hash of the PR.

- **Authorization**: The API key is used for authentication, which is
  stored in GitHub Secrets (ZENCODER_API_KEY).

### **4. Testing the Integration**

1.  **Create a Pull Request**:

    - After the workflow file is committed to your repository, create a
      **pull request** for any branch (e.g., feature/\*, development,
      main).

    - This should automatically trigger **GitHub Actions**, and Zencoder
      will review the PR.

2.  **Zencoder Review**:

    - Zencoder will analyze the code for:

      - **Code quality** (readability, consistency).

      - **Performance** (inefficiencies, slow algorithms).

      - **Security vulnerabilities** (SQL injection, XSS).

      - **Test coverage** (ensuring critical code paths are tested).

    - Zencoder will leave feedback as **comments** directly on the PR.

### **5. Monitor Zencoder Review Feedback**

- Once the Zencoder review is triggered, **feedback** will appear in the
  **GitHub pull request** as comments.

- The feedback will include:

  - **Bugs**, **performance issues**, or **missing tests**.

  - **Suggestions** for improving the code (e.g., security or
    performance recommendations).

No manual review is required --- everything is fully automated.

### **6. Optional: Automating the Merge Process**

You can set up **automatic merging** after the Zencoder review if all
conditions are met (e.g., no issues found).

1.  **Add a Merge Step** (Optional):

    - You can configure GitHub Actions to automatically merge the PR
      after Zencoder approves it. Here's an example:

 - name: Merge PR after Zencoder Review

run: \|

if \[\[ \"\$(curl -s https://zencoder.ai/api/review-status?commit=\${{
github.sha }})\" == \"approved\" \]\]; then

echo \"Merging PR\"

git checkout main

git merge \${{ github.head_ref }}

git push

else

echo \"Zencoder review failed\"

exit 1

fi

- \
  This will automatically merge the PR if Zencoder approves it and then
  push the changes to main (or any other configured branch).

### **7. Conclusion**

With this setup:

- **Zencoder reviews** are triggered automatically on every PR.

- **Automated feedback** is provided through GitHub comments.

- Developers **automatically fix issues** based on feedback, triggering
  another review by Zencoder.

- **Optional automatic merging** can be configured after the PR passes
  Zencoder's review.

This setup will work seamlessly with **Render**, ensuring that only code
that passes Zencoder's review process is merged and deployed.

### **Next Steps:**

1.  Test the integration by submitting a pull request and ensuring
    Zencoder automatically reviews it.

2.  Optionally, set up the **automatic merge** and **deployment**
    process once the review passes.
