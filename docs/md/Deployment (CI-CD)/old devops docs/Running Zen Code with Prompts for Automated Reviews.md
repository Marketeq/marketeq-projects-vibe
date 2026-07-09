## **Running Zen Code with Prompts for Automated Reviews**

### **Overview:**

This document explains how to configure Zen Code to automatically review
pull requests using the predefined prompts without any manual
intervention. Zen Code will handle everything, from reviewing the code
to generating feedback for the developer.

### **Steps to Automate Reviews Using Zen Code Prompts:**

### **1. Ensure Zen Code is Integrated with GitHub:**

- Follow **Document 1** to complete the GitHub integration setup.

- Zen Code will be connected to GitHub and ready to review pull requests
  automatically.

### **2. Set Up Automated Prompt Trigger in Zen Code:**

- Go to the **Zen Code Dashboard** and navigate to **Settings**.

- Under **Automated Actions**, enable the **Auto Review on Pull
  Requests** option.

- Configure Zen Code to use the following prompt automatically when a
  new pull request is created:

\"Please analyze the following pull request and perform the following
tasks automatically:

1\. \*\*Initial Code Review\*\*: Check for the following:

\- Correctness of implemented functionality (feature or bug fix)

\- Code readability and adherence to coding standards (naming
conventions, indentation)

\- Security vulnerabilities (e.g., SQL injections, improper input
handling)

\- Performance issues (e.g., inefficient code, bottlenecks)

\- Missing or outdated documentation (e.g., missing docstrings, unclear
function definitions)

\- Any potential bugs or logical errors

\- Edge cases not considered in the implementation

2\. \*\*Generate List of Issues\*\*: Provide a comprehensive list of
identified issues. Categorize them into:

\- \*\*Bugs\*\*: Any defects or logic errors.

\- \*\*Performance Issues\*\*: Inefficiencies or bottlenecks.

\- \*\*Security Flaws\*\*: Vulnerabilities or risks.

\- \*\*Readability Issues\*\*: Problems with naming conventions,
indentation, or overall structure.

\- \*\*Missing Documentation\*\*: Unexplained methods, functions, or
classes.

\- \*\*Test Coverage Issues\*\*: Missing unit or integration tests.

3\. \*\*Notify Developer\*\*: Automatically send a detailed list of
these issues to the developer. Do not apply any fixes, only generate
feedback for the developer to address. Include actionable suggestions
where applicable.

4\. \*\*Pre-Merge Check\*\*: Once the developer has fixed the issues and
resubmitted the pull request, check the following:

\- Ensure all tests (unit, integration) pass without errors.

\- Ensure no critical bugs or security vulnerabilities remain.

\- Ensure code is adhering to style guidelines and naming conventions.

\- Ensure documentation is complete and up to date.

5\. \*\*Automated Merge\*\*: If the pull request passes the pre-merge
check (i.e., all tests pass, no issues remain, and code adheres to
standards), approve and merge the pull request automatically.\"

### **3. Automate the Workflow:**

- **Trigger**: Once the above prompt is set up, Zen Code will
  automatically trigger every time a new pull request is submitted.

- **Zen Code Actions**:

  - It will run the **code review** immediately.

  - It will **notify the developer** by posting feedback as comments on
    the pull request.

  - Once the developer has fixed the issues and resubmitted the PR, Zen
    Code will **automatically run a pre-merge check**.

  - If everything is in order, Zen Code will **automatically approve and
    merge the pull request**.

### **4. Monitoring & Logging:**

- In the Zen Code dashboard, you can monitor the status of your pull
  requests and view logs of the automatic reviews performed by Zen Code.

- You will receive **summary notifications** in your dashboard or via
  email for each review, as well as any comments made on pull requests.

### **Summary:**

- **Zen Code in GitHub**: Zen Code is set up to automatically review
  pull requests, leave comments with issues, and send notifications to
  the developer.

- **Automated Prompt Usage**: By configuring Zen Code with the provided
  review prompts, it will handle all steps from analyzing the code to
  notifying developers and automatically merging pull requests once
  issues are resolved.

- **No Manual Work**: The process is fully automated after the initial
  setup, so you only need to create a pull request, and Zen Code will
  handle everything from review to merge.
