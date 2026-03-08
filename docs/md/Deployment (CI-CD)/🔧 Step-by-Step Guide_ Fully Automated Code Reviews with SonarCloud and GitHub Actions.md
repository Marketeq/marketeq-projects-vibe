**🔧 Step-by-Step Guide: Fully Automated Code Reviews with SonarCloud
and GitHub Actions**

### **1. SonarCloud Account Setup**

- **Sign Up**: Visit [[SonarCloud]{.underline}](https://sonarcloud.io/)
  and sign up using your GitHub account.

- **Create an Organization**: During the setup, create a new
  organization or select an existing one.([[Azure DevOps
  Labs]{.underline}](https://azuredevopslabs.com/labs/vstsextend/sonarcloud/?utm_source=chatgpt.com))

- **Generate a Token**:

  - Navigate to your account settings.

  - Go to **Security** and click on **Generate Tokens**.

  - Name your token (e.g., github-actions-token) and click **Generate**.

  - Copy the generated token immediately; you won\'t be able to view it
    again.([[Medium]{.underline}](https://medium.com/%40rahulsharan512/integrating-sonarcloud-with-github-actions-for-secure-code-analysis-26a7fa206d40?utm_source=chatgpt.com))

### **2. Configure GitHub Repository**

- **Add SonarCloud Token to GitHub Secrets**:

  - In your GitHub repository, go to **Settings** \> **Secrets and
    variables** \> **Actions**.

  - Click **New repository secret**.

  - Name the secret SONAR_TOKEN and paste the token you copied from
    SonarCloud.

  - Click **Add secret**.([[DEV
    Community]{.underline}](https://dev.to/s3cloudhub/automate-and-elevate-integrating-github-actions-with-sonarcloud-for-superior-code-quality-2jj8?utm_source=chatgpt.com),
    [[Medium]{.underline}](https://medium.com/%40rahulsharan512/integrating-sonarcloud-with-github-actions-for-secure-code-analysis-26a7fa206d40?utm_source=chatgpt.com))

### **3. Set Up GitHub Actions Workflow**

- **Create Workflow File**:

  - In your repository, create the following directory and file:

.github/

workflows/

sonarcloud.yml

- \
  **Configure Workflow**:\
  Add the following content to sonarcloud.yml:

 name: SonarCloud Analysis

on:

push:

branches:

\- main

pull_request:

branches:

\- main

jobs:

sonarcloud:

runs-on: ubuntu-latest

steps:

\- name: Checkout code

uses: actions/checkout@v3

\- name: Set up JDK 11

uses: actions/setup-java@v3

with:

java-version: \'11\'

distribution: \'temurin\'

\- name: Cache SonarCloud scanner

uses: actions/cache@v3

with:

path: \~/.sonar/cache

key: \${{ runner.os }}-sonarcloud

restore-keys: \|

\${{ runner.os }}-sonarcloud

\- name: Cache Maven packages

uses: actions/cache@v3

with:

path: \~/.m2

key: \${{ runner.os }}-m2-\${{ hashFiles(\'\*\*/pom.xml\') }}

restore-keys: \|

\${{ runner.os }}-m2

\- name: Build and analyze

run: mvn -B verify
org.sonarsource.scanner.maven:sonar-maven-plugin:sonar

-Dsonar.projectKey=my_project_key

-Dsonar.organization=my_organization

-Dsonar.host.url=https://sonarcloud.io

env:

SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}

- \
  **Replace placeholders**:

  - my_project_key: Your SonarCloud project key.

  - my_organization: Your SonarCloud organization key.

### **4. Configure SonarCloud Project**

- **Set Analysis Method**:

  - In SonarCloud, navigate to your project.

  - Go to **Administration** \> **Analysis Method**.

  - Select **GitHub Actions** and follow the provided
    instructions.([[SonarSource]{.underline}](https://www.sonarsource.com/plans-and-pricing/?utm_source=chatgpt.com),
    [[Sonar
    Community]{.underline}](https://community.sonarsource.com/t/sonar-guidance-for-coverage-in-github-actions-builds/48374?utm_source=chatgpt.com),
    [[SonarQube
    Docs]{.underline}](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/ci-based-analysis/github-actions-for-sonarcloud/?utm_source=chatgpt.com))

- **Configure Quality Gate**:

  - In SonarCloud, go to **Quality Gates**.

  - Set up a quality gate that suits your project\'s standards (e.g., no
    new critical issues, sufficient test coverage).

  - Assign this quality gate to your
    project.([[SonarSource]{.underline}](https://www.sonarsource.com/plans-and-pricing/?utm_source=chatgpt.com))

### **5. Automate Pull Request Decoration**

- **Enable PR Decoration**:

  - In SonarCloud, navigate to your project.

  - Go to **Administration** \> **Analysis Method**.

  - Ensure that **Pull Request Decoration** is enabled.([[DEV
    Community]{.underline}](https://dev.to/s3cloudhub/automate-and-elevate-integrating-github-actions-with-sonarcloud-for-superior-code-quality-2jj8?utm_source=chatgpt.com),
    [[Sonar
    Community]{.underline}](https://community.sonarsource.com/t/sonar-guidance-for-coverage-in-github-actions-builds/48374?utm_source=chatgpt.com),
    [[Software
    Advice]{.underline}](https://www.softwareadvice.com/continuous-integration/sonarcloud-profile/?utm_source=chatgpt.com))

- **Configure GitHub Integration**:

  - In SonarCloud, go to **Administration** \> **Organization Settings**
    \> **GitHub**.

  - Connect your GitHub organization and grant necessary permissions.

### **6. Monitor and Enforce Quality Standards**

- **View Analysis Results**:

  - After pushing code or creating a pull request, SonarCloud will
    automatically analyze your code.

  - View the results in the SonarCloud dashboard under your
    project.([[Medium]{.underline}](https://medium.com/%40rahulsharan512/integrating-sonarcloud-with-github-actions-for-secure-code-analysis-26a7fa206d40?utm_source=chatgpt.com))

- **Enforce Quality Gate**:

  - In GitHub, navigate to your repository.

  - Go to **Settings** \> **Branches**.

  - Add a branch protection rule for the main branch.

  - Under **Status checks**, require the SonarCloud quality gate status
    check to pass before merging.

## **💰 SonarCloud Pricing for Private Repositories**

As of 2025, SonarCloud offers the following plans for private
repositories:([[TechJockey]{.underline}](https://www.techjockey.com/detail/sonarcloud?srsltid=AfmBOooXTpzdZOwnEzfaABjSRk3XjxbbCRt4aItHxvAuLbOchhwe5TqF&utm_source=chatgpt.com))

- **Free Plan**:

  - Supports up to **50,000 lines of code (LoC)**.

  - Suitable for small projects or trial purposes.

- **Team Plan**:

  - Pricing starts at **€30/month** (approximately **\$32 USD/month**)
    for **100,000 LoC**.

  - Includes advanced features like AI CodeFix, branch analysis, and
    pull request
    decoration.([[DEVOPSdigest]{.underline}](https://www.devopsdigest.com/sonar-introduces-sonarcloud-enterprise-and-team-plans?utm_source=chatgpt.com))

- **Enterprise Plan**:

  - Pricing is **custom** and based on the number of LoC analyzed.

  - Offers enterprise-level features such as SSO, portfolio management,
    and advanced security
    analysis.([[SonarSource]{.underline}](https://www.sonarsource.com/plans-and-pricing/?utm_source=chatgpt.com))

For detailed pricing and features, refer to the [[SonarCloud Pricing
Page]{.underline}](https://www.sonarsource.com/plans-and-pricing/sonarcloud/).

## **✅ Final Notes**

- **Zero Human Involvement**: This setup ensures that code analysis is
  fully automated with no manual intervention required.

- **Real-Time Feedback**: Developers receive immediate feedback on code
  quality and security issues directly within GitHub pull requests.

- **Continuous Integration**: Integrating SonarCloud with GitHub Actions
  provides continuous code quality checks as part of your CI/CD
  pipeline.
