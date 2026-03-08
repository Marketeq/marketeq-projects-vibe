# **Suggested Usernames Based on First Name and Job Title**

### **Purpose**

The goal is to **suggest usernames** to users during the onboarding
process based on their **first name** and **job title**. This will be
done using **semantic matching** based on the **contextual
relationships** between the **first name** and **job title**, without
any need for manual tags or static assignments.

### **How It Works**

1.  **User Inputs**:

    - The user provides their **first name** (e.g., \"John\").

    - The user selects or inputs their **job title** (e.g., \"Software
      Engineer\").

2.  **Dynamic Username Suggestions**:

    - Based on the **first name** and **job title**, the system will
      generate **semantic-based suggestions** for usernames.

    - The suggestions will **contextually** relate to the user's **job
      title** and **first name** to ensure that the username is
      **relevant** and **professional**.

3.  **Semantic Matching**:

    - Using **semantic matching**, the system will evaluate the
      **context** of the **first name** and **job title** to generate
      relevant username suggestions.

    - This can be done by analyzing **common patterns** from **existing
      usernames** or **using semantic models** like **BERT** to ensure
      suggestions are both **unique** and **appropriate**.

### **Backend Implementation for Generating Username Suggestions**

1.  **Install Hugging Face Library for Semantic Matching\**

To generate meaningful suggestions, you can use **semantic matching**
with Hugging Face models to dynamically generate potential usernames.

pip install transformers

2.  \
    **Backend Code to Fetch Username Suggestions\**

The backend service will fetch **suggested usernames** based on the
**first name** and **job title** the user inputs. Semantic models will
help match patterns in real-time.

**Example Code (NestJS)**:

import { Injectable } from \'@nestjs/common\';

import { HttpService } from \'@nestjs/axios\';

import { lastValueFrom } from \'rxjs\';

\@Injectable()

export class UsernameRecommendationService {

constructor(private readonly httpService: HttpService) {}

// Function to fetch username suggestions based on first name and job
title

async getSuggestedUsernames(firstName: string, jobTitle: string):
Promise\<string\[\]\> {

const modelUrl =
\"https://api-inference.huggingface.co/models/facebook/bart-large-mnli\";
// Hugging Face model endpoint

const inputs = {

sequence: firstName, // Use first name as the base input

candidate_labels: \[jobTitle\] // Use job title to generate relevant
suggestions

};

try {

const response = await lastValueFrom(

this.httpService.post(modelUrl, inputs)

);

return response.data.labels; // Return username suggestions

} catch (error) {

console.error(\'Error generating username suggestions:\', error);

return \[\];

}

}

}

3.  \
    **API Endpoint to Fetch Suggested Usernames\**

The API will accept **first name** and **job title** as parameters and
return **relevant usernames**.

**Example Controller (NestJS)**:

import { Controller, Get, Query } from \'@nestjs/common\';

import { UsernameRecommendationService } from
\'./username-recommendation.service\';

\@Controller(\'username-suggestions\')

export class UsernameRecommendationController {

constructor(private readonly usernameRecommendationService:
UsernameRecommendationService) {}

\@Get()

async getSuggestedUsernames(

\@Query(\'firstName\') firstName: string,

\@Query(\'jobTitle\') jobTitle: string

) {

return
this.usernameRecommendationService.getSuggestedUsernames(firstName,
jobTitle);

}

}



### **Frontend: How to Get Username Suggestions**

The frontend will call the **username suggestion API** using **first
name** and **job title** from the previous step. This API will return
**contextually appropriate usernames** based on the inputs.

**Function to Get Selected First Name and Job Title from Frontend**:

async function getSelectedFirstNameAndJobTitle() {

const firstName = document.querySelector(\'#first_name\').value;

const jobTitle = document.querySelector(\'#job_title\').value;

return { firstName, jobTitle };

}

**Calling the API to Get Suggested Usernames**:

async function getSuggestedUsernames() {

const { firstName, jobTitle } = await getSelectedFirstNameAndJobTitle();

const response = await
fetch(\`/api/username-suggestions?firstName=\${firstName}&jobTitle=\${jobTitle}\`);

const data = await response.json();

displaySuggestedUsernames(data);

}

function displaySuggestedUsernames(usernames) {

const usernamesList = document.querySelector(\'#username_suggestions\');

usernamesList.innerHTML = \'\'; // Clear existing list

usernames.forEach(username =\> {

const listItem = document.createElement(\'li\');

listItem.textContent = username;

usernamesList.appendChild(listItem);

});

}

**HTML Example for Displaying Suggested Usernames**:

\<div\>

\<button onclick=\"getSuggestedUsernames()\"\>Get Username
Suggestions\</button\>

\<ul id=\"username_suggestions\"\>

\<!\-- Suggested usernames will be dynamically added here \--\>

\</ul\>

\</div\>



### **Username Rules and Logic**

Please refer to the separate **Username Rules document** for detailed
guidelines on **username format** and **validity**.

### **Key Username Rules:**

- Usernames must be **unique** across the platform.

- All usernames must be in **lowercase**.

- **Allowed characters**: Lowercase letters (a-z), numbers (0-9), and
  underscores (\_).

- **Length**: Must be between **3 and 15 characters**.

- **Prohibited characters**: Uppercase letters, spaces, emojis, special
  characters (e.g., !, %, &, @).

- **Restrictions**: Usernames cannot start with a number, contain two
  underscores in a row, or begin or end with an underscore.

- **Forbidden terms**: No usernames can impersonate others or contain
  sensitive patterns like phone numbers or email addresses.
