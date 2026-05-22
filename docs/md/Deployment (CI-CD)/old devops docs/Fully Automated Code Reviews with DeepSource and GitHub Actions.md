### **Fully Automated Code Reviews with DeepSource and GitHub Actions**

#### **1. DeepSource Account Setup**

1.  **Sign Up for DeepSource**:

    - Go to [[DeepSource]{.underline}](https://deepsource.io/) and sign
      up using your **GitHub account**.

    - After signing up, create a **new organization** in DeepSource if
      you haven\'t done so already.

2.  **Generate DeepSource Token**:

    - Go to **Account Settings** in DeepSource.

    - Under **API tokens**, click **Create New Token** and generate a
      new token. Copy the token; you\'ll need it later for GitHub
      Actions.

### **2. Configure GitHub Repository with DeepSource**

1.  **Add DeepSource Token to GitHub Secrets**:

    - Go to your **GitHub repository**.

    - In **Settings** \> **Secrets and variables** \> **Actions**, click
      **New repository secret**.

      - Name: DEEPSOURCE_TOKEN

      - Value: Paste the token you copied from DeepSource.

    - Click **Add secret**.

2.  **Link GitHub Repository to DeepSource**:

    - Go to your **DeepSource** organization dashboard.

    - Click **Add Repository** and link the repository from GitHub.

    - Select the relevant repositories for automated code reviews.

### **3. Set Up GitHub Actions Workflow for Automation**

1.  **Create a GitHub Actions Workflow File**:

    - In your GitHub repository, navigate to .github/workflows/.

    - Create a new file called deepsource.yml.

2.  **Add the Workflow Configuration**:

    - Copy and paste the following configuration into the deepsource.yml
      file:

name: DeepSource Analysis

on:

push:

branches:

\- main

pull_request:

branches:

\- main

jobs:

deepsource:

runs-on: ubuntu-latest

steps:

\- name: Checkout code

uses: actions/checkout@v2

\- name: DeepSource Analysis

uses: deepsource/action@v0.1

with:

token: \${{ secrets.DEEPSOURCE_TOKEN }}

#### **Explanation of Workflow:**

- **Trigger**: The workflow triggers on **push** and **pull request**
  events for the main branch.

- **DeepSource Analysis**: The deepsource/action GitHub Action will run
  the static analysis when changes are pushed or when a PR is created.
  It will send the results back to DeepSource and comment on the PR with
  the feedback.

- **DeepSource Token**: The token stored in GitHub Secrets
  (DEEPSOURCE_TOKEN) is used for authentication.

### **4. Enable Pull Request Comments for DeepSource Feedback**

1.  **Configure DeepSource to Comment on GitHub PRs**:

    - By default, DeepSource integrates with GitHub and posts comments
      on the **pull request** automatically.

    - This feedback will include **code quality issues**, **security
      vulnerabilities**, and **performance bottlenecks** detected in the
      code.

2.  **Customize Your DeepSource Configuration (Optional)**:

    - Go to **DeepSource Settings** \> **Configuration**.

    - Customize the checks to enforce the rules and standards relevant
      to your project (e.g., performance checks, security rules, style
      guides).

### **5. Automated Review Process (Zero Human Involvement)**

- **Automated Analysis**: With the workflow set up, **DeepSource** will
  automatically review code in pull requests and push events.

- **PR Feedback**: DeepSource will leave **comments on the PR** with
  detailed information on:

  - **Bugs**.

  - **Security vulnerabilities**.

  - **Code smells**.

  - **Performance issues**.

- **PR Approval/Disapproval**: Developers can view and address the
  issues identified by DeepSource before merging the PR.

### **6. Auto-Merge PRs After Review (Optional)**

If you want to **automatically merge PRs** once they pass DeepSource\'s
code review, you can add the following step to your GitHub Actions
workflow:

 - name: Auto-merge if passed

if: success()

run: \|

gh pr merge \${{ github.event.pull_request.number }} \--merge \--auto

This will automatically merge the PR if **DeepSource passes the
analysis** and no critical issues are found.

### **7. Monitor and Enforce Quality Standards**

1.  **GitHub Branch Protection**:

    - In **GitHub**, navigate to **Settings** \> **Branches**.

    - Add a **branch protection rule** for the main branch.

    - Under **Status checks**, require the DeepSource status check to
      pass before merging a PR.

2.  **Ensure Code Quality**:

    - You can enforce that **PRs cannot be merged** unless they pass
      **all quality checks** set by DeepSource.

    - This ensures that every merge to main meets your defined **code
      quality**, **security**, and **performance standards**.

### **8. Conclusion:**

With **DeepSource** integrated into **GitHub Actions**, your repository
now has **fully automated code reviews** with **zero human
involvement**:

- **Code is automatically analyzed** with each PR or push.

- **Feedback is posted** as comments on the GitHub PRs.

- **PRs can be auto-merged** after passing the review.

This setup ensures that you maintain high-quality, secure, and
performant code while automating the review process entirely. The
integration with **Render** for deployment is streamlined, and you won't
need to manually intervene in the review process.

### **Next Steps:**

- **Test the setup**: Push changes or create a PR to see DeepSource's
  analysis in action.

- **Enforce quality gates**: Set up **branch protection rules** in
  GitHub to require DeepSource feedback before merging.
