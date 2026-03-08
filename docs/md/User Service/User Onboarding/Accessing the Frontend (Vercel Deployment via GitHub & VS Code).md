# **Accessing the Frontend (Vercel Deployment via GitHub & VS Code)**

### **Overview**

You need to work with the **real frontend** deployed on **Vercel**, not
**Storybook**, as Storybook is for **UI component development**. This
guide will help you access the **Vercel-deployed frontend**, push
changes via **GitHub**, and view the deployed frontend.

### **Step 1: Accessing the Frontend Code via GitHub**

1.  **Clone the Frontend Repository**:

    - The **frontend repository** is located at
      [[https://github.com/CTorres9800/marketeq-projects]{.underline}](https://github.com/CTorres9800/marketeq-projects).

    - Open **VS Code** and clone the repository.

2.  To clone the repo:

    - Open **VS Code**, go to the **terminal**, and run:

git clone https://github.com/CTorres9800/marketeq-projects.git

- \
  This will clone the **frontend repo** to your local machine.

3.  **Navigate to the Project Folder**:

    - After cloning, open the project folder in **VS Code**.

    - Make sure you have the **correct branch** to work on (e.g., main
      or feature/onboarding).

cd marketeq-projects



### **Step 2: Running the Frontend Locally**

1.  **Install Dependencies**:

    - Once inside the frontend project directory, run the following
      command to install all **dependencies**:

npm install

2.  **Run the Local Development Server**:

    - After installation, start the **local development server** to run
      the frontend code locally:

npm run dev

- \
  This will start the server, and you should be able to view the
  frontend at http://localhost:3000 in your browser.

**Talent Onboarding Screen Path:**

- The **Talent Onboarding** screen is located at:

app/(group)/onboarding/talent/page.tsx

### **Client Onboarding Screen Path:**

- The **Client Onboarding** screen is located at:

app/(group)/onboarding/client

These paths correspond to the **onboarding screens** for both
**Talent** and **Client** in your **Vercel-deployed frontend**
repository.

### **Step 3: Making Changes and Pushing Code to GitHub**

1.  **Create a New Branch (for your work)**:

    - It\'s best to create a new branch for your work to keep it
      separate from main:

git checkout -b feature/onboarding-screens

2.  \
    **Make Your Changes**:

    - Now, you can make changes to the onboarding screens or any other
      frontend component.

3.  **Stage and Commit Changes**:

    - After making the necessary changes, **stage** the changes for
      commit:

git add .

- \
  **Commit** the changes with a descriptive message:

git commit -m \"Updated onboarding screens\"

4.  \
    **Push Changes to GitHub**:

    - Push your changes to **GitHub**:

git push origin feature/onboarding-screens



### **Step 4: Deploying to Vercel**

Since **Vercel** is already **linked to GitHub**, any push to GitHub
will trigger an automatic deployment to Vercel.

1.  **Vercel Automatic Deployment**:

    - Once you push your changes (as shown in Step 3), **Vercel** will
      automatically deploy the changes to a **preview URL**.

2.  **View the Frontend**:

    - After the deployment, Vercel will provide a **preview URL** to
      view the changes. You can find the link in the **Vercel
      dashboard** or from the **GitHub pull request**.

### **Step 5: Verify the Changes**

1.  **Test Your Changes**:

    - After the **Vercel deployment**, click the **preview URL** to view
      your changes live on the deployed frontend.

    - Make sure everything looks and works as expected.

2.  **Merge Changes** (if applicable):

    - If you\'re working on a feature branch, create a **pull request**
      in **GitHub** to merge your changes into the **main** branch.

    - After merging, Vercel will automatically deploy the changes to the
      live environment.

### **Conclusion**

By following this guide, you should now be able to:

- Access the **Vercel-deployed frontend** via **GitHub** and **VS
  Code**.

- **Make changes** to the **onboarding screens**.

- **Push code** to GitHub and automatically deploy it to **Vercel** for
  easy viewing.
