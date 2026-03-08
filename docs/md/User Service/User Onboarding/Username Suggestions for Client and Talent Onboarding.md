### **Username Suggestions for Client and Talent Onboarding**

### **1. Backend (NestJS): Generating Creative Usernames with Hugging Face**

To ensure that the developer uses the **right Hugging Face models** and
provides **clear instructions**, here's what they need to do:

#### **Step 1: Install Required Packages**

1.  Install the **axios** package for making HTTP requests to Hugging
    Face:

npm install \@nestjs/axios axios

2.  \
    Install the **Hugging Face API** for **semantic matching**:

npm install transformers

#### **Step 2: Backend Service to Generate Usernames**

The backend service will:

- Fetch the **job title**, **skills**, and **industry**.

- Use **Hugging Face\'s API** for **semantic matching** to generate
  **creative usernames**.

Here's the **exact code** for the **backend** (NestJS):

import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { UserRepository } from \'./user.repository\';

import { lastValueFrom } from \'rxjs\';

\@Injectable()

export class UsernameRecommendationService {

constructor(

private readonly userRepository: UserRepository,

private readonly httpService: HttpService

) {}

// Function to check if username is available

async isUsernameAvailable(username: string): Promise\<boolean\> {

const user = await this.userRepository.findOne({ where: { username } });

return !user; // Returns true if username is available

}

// Function to generate creative usernames using Hugging Face models

async generateCreativeUsernames(jobTitle: string, skills: string\[\],
industry: string): Promise\<string\[\]\> {

// Hugging Face API for semantic matching (using a model like BART for
zero-shot classification)

const modelUrl =
\"https://api-inference.huggingface.co/models/facebook/bart-large-mnli\";

// Prepare the input data for Hugging Face\'s zero-shot classification
model

const inputs = {

sequence: jobTitle, // Job title as the base input

candidate_labels: \[industry, \...skills\] // Use related skills and
industry as labels for creativity

};

// Send the request to Hugging Face API

const response = await lastValueFrom(this.httpService.post(modelUrl,
inputs));

// Fetch related keywords from Hugging Face output (labels)

const relatedWords = response.data.labels;

// Generate creative usernames

const usernames = \[\];

for (let i = 0; i \< 5; i++) {

const randomSuffix = Math.floor(Math.random() \* 1000); // Add random
number for uniqueness

const username = \`\${relatedWords\[i\]}\_\${jobTitle.replace(/\\s+/g,
\'\')}\${randomSuffix}\`; // Create unique username

const isAvailable = await this.isUsernameAvailable(username);

if (isAvailable) {

usernames.push(username);

}

}

return usernames; // Return the list of unique usernames

}

}

- \
  **Explanation**:

  - The generateCreativeUsernames function uses **Hugging Face\'s BART
    model** to fetch **related keywords** for job titles and skills.

  - It checks if the generated username is **available** in the system
    before suggesting it.

  - The final **suggested usernames** include random numbers and related
    keywords.

### **2. Frontend (TypeScript / Next.js)**

For the **frontend** (in **TypeScript/Next.js**), the code will fetch
**username suggestions** from the backend (generated with Hugging Face)
and display them to the user.

#### **Step 1: Fetch Username Suggestions from the Backend**

Here's the **exact code** for the **frontend** (TypeScript/Next.js) to
**fetch the username suggestions** from the backend and **display
them**:

import { useState } from \'react\';

const UsernameSuggestions = () =\> {

const \[suggestedUsernames, setSuggestedUsernames\] =
useState\<string\[\]\>(\[\]);

// Function to get suggested usernames from the backend

const getSuggestedUsernames = async (jobTitle: string, skills:
string\[\], industry: string) =\> {

const response = await
fetch(\`/api/username-suggestions?jobTitle=\${jobTitle}&skills=\${skills.join(\',\')}&industry=\${industry}\`);

const data = await response.json();

setSuggestedUsernames(data); // Update the state with the suggested
usernames

};

// Call this function when the user inputs job title, skills, and
industry

const handleGetSuggestions = () =\> {

const jobTitle = \'Software Developer\'; // Example: Replace with user
input

const skills = \[\'React.js\', \'Node.js\'\]; // Example: Replace with
user input

const industry = \'Tech & Software\'; // Example: Replace with user
input

getSuggestedUsernames(jobTitle, skills, industry);

};

return (

\<div\>

\<button onClick={handleGetSuggestions}\>Get Username
Suggestions\</button\>

\<ul\>

{suggestedUsernames.map((username, index) =\> (

\<li key={index}\>{username}\</li\>

))}

\</ul\>

\</div\>

);

};

export default UsernameSuggestions;

- \
  **Explanation**:

  - The getSuggestedUsernames function calls the backend API, passing
    the **job title**, **skills**, and **industry**.

  - The response contains a list of suggested usernames, which are then
    displayed in a **list** on the frontend.

### **3. Full Integration Steps**

1.  **Frontend (Next.js)**:

    - The user enters **job title**, **skills**, and **industry** in the
      onboarding form.

    - When the user clicks the **\"Get Username Suggestions\"** button,
      the frontend will send a **request to the backend** with those
      inputs.

    - The backend will return **creative, unique usernames** based on
      **semantic matching**, and the frontend will display those
      usernames.

2.  **Backend (NestJS)**:

    - The backend uses **Hugging Face's BART model** (or another model
      you choose) to generate relevant **keywords** based on the user's
      **job title** and **skills**.

    - It then constructs **unique usernames** using these keywords,
      **random numbers**, and **suffixes**.

    - The backend **checks availability** of each suggested username and
      returns only those that are **available**.

3.  **Vercel Deployment**:

    - The code is **deployed to Vercel**, and any updates will trigger
      automatic **deployment previews**.

### **Conclusion**

This solution ensures that:

- The **backend** handles **semantic matching** and **username
  generation**.

- The **frontend** displays **creative usernames** to users based on the
  data from previous onboarding screens.

- The system is **efficient**, using **Hugging Face models** for
  creativity without excessive cost.

- The generated **usernames** are **checked for availability** before
  being shown to the user.
