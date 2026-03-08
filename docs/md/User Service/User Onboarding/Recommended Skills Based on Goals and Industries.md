# **Recommended Skills Based on Goals and Industries**

### **Purpose**

This functionality provides **dynamic skill recommendations** based on
the **user\'s selected goals** and **industry** during the onboarding
process. **Semantic matching** is used to recommend **relevant skills**
based on the context of the **industry** and **goals** the user selects.
This solution does not rely on **pre-matching** skills to industries or
goals, but instead uses **dynamic matching** and **semantic models** for
accurate recommendations.\
\
This solution uses **semantic matching** to **dynamically recommend
skills** based on the **industry** and **goals** the user selects during
the onboarding process. The system **fetches the goals and industry**
from the **user profile** in the database and uses this data to perform
**semantic analysis** with **Hugging Face models**.

The entire process ensures **dynamic, relevant, and scalable**
recommendations, without requiring manual tagging or pre-categorizing
skills, making it more efficient and future-proof.

### **How It Works**

1.  **User Inputs**:

    - The user selects their **industry** (e.g., \"Tech & Software\",
      \"Marketing & Advertising\").

    - The user selects their **goals** (e.g., \"Product & Service
      Development\", \"Growth & Expansion\").

2.  **Dynamic Recommendations**:

    - Based on the **industry** and **goals** selected by the user, the
      system will **dynamically recommend skills** relevant to those
      selections.

    - **Semantic matching** is used to identify **related skills** based
      on the selected industry and goals, without predefining tags for
      each skill.

3.  **Fetching Goals and Industry from the Database**:

    - The **goals** and **industry** selected by the user are **saved in
      the database** when they complete the onboarding process.

    - When the user makes further selections, the **recommended skills**
      are fetched based on the **goals** and **industry** already stored
      in the user\'s profile in the database.

### **Backend Implementation for Dynamic Skill Matching**

#### **1. Install Hugging Face Library for Semantic Matching**

To implement **semantic matching**, use the **Hugging Face
Transformers** library. This will allow the system to perform **semantic
analysis** for matching skills to the selected goals and industries.

pip install transformers

#### **2. Backend Code to Fetch Recommended Skills**

The **recommended skills** will be fetched dynamically using **semantic
matching**. The backend service will fetch skills based on the selected
**industry** and **goals** from the database, and apply **semantic
models** to generate recommendations.

**Example Code (NestJS)**:

import { Injectable } from \'@nestjs/common\';

import { SkillRepository } from \'./skill.repository\';

import { HttpService } from \'@nestjs/axios\';

import { lastValueFrom } from \'rxjs\';

\@Injectable()

export class SkillRecommendationService {

constructor(

private readonly skillRepository: SkillRepository,

private readonly httpService: HttpService

) {}

// Function to fetch recommended skills from the database and perform
semantic matching

async getRecommendedSkills(userId: number): Promise\<string\[\]\> {

// Fetch user data (goals and industry) from the database

const user = await this.skillRepository.findUserById(userId);

const { goals, industry } = user;

// Fetch skills dynamically based on industry and goals

const skills = await this.skillRepository.find({

where: { category: industry, tags: In(goals) },

});

// Perform semantic matching (using Hugging Face API or internal logic)

const modelUrl =
\"https://api-inference.huggingface.co/models/facebook/bart-large-mnli\";

const inputs = {

sequence: \'Product Management\', // Dynamic skill

candidate_labels: \[industry, \...goals\], // Dynamic industry and goal

};

const response = await lastValueFrom(

this.httpService.post(modelUrl, inputs)

);

// Return matched skills or categories from the model

return response.data.labels;

}

}

#### **3. API Endpoint to Fetch Recommended Skills**

The API endpoint will allow fetching **recommended skills** based on
**user data** (goals and industry).

**Example Controller (NestJS)**:

import { Controller, Get, Param } from \'@nestjs/common\';

import { SkillRecommendationService } from
\'./skill-recommendation.service\';

\@Controller(\'recommended-skills\')

export class SkillRecommendationController {

constructor(private readonly skillRecommendationService:
SkillRecommendationService) {}

\@Get(\':userId\')

async getRecommendedSkills(@Param(\'userId\') userId: number) {

return this.skillRecommendationService.getRecommendedSkills(userId);

}

}



### **Frontend: How to Fetch Selected Goals and Industry**

On the frontend, the **goals** and **industry** selected by the user in
previous steps will be used to fetch **recommended skills**. These
values should be **stored in the database** and used for generating
dynamic recommendations.

**Function to Get Selected Goals and Industry from Frontend**:

async function getSelectedGoalsAndIndustry() {

// Get the selected goals from the dropdown or multi-select field

const goals =
Array.from(document.querySelector(\'#business_goals\').selectedOptions)

.map(option =\> option.value); // Get selected goals

// Get the selected industry from the dropdown

const industry = document.querySelector(\'#industry\').value; // Get
selected industry

return { goals, industry }; // Return selected goals and industry

}

**Calling the API to Get Recommended Skills**:

async function getRecommendedSkills() {

const { goals, industry } = await getSelectedGoalsAndIndustry();

const response = await
fetch(\`/api/recommended-skills/\${userId}?goals=\${goals.join(\',\')}&industry=\${industry}\`);

const data = await response.json();

displayRecommendedSkills(data);

}

function displayRecommendedSkills(skills) {

const skillsList = document.querySelector(\'#recommended_skills\');

skillsList.innerHTML = \'\'; // Clear existing list

skills.forEach(skill =\> {

const listItem = document.createElement(\'li\');

listItem.textContent = skill;

skillsList.appendChild(listItem);

});

}

**HTML for Displaying Recommended Skills**:

\<div\>

\<button onclick=\"getRecommendedSkills()\"\>Show Recommended
Skills\</button\>

\<ul id=\"recommended_skills\"\>

\<!\-- Recommended skills will be dynamically added here \--\>

\</ul\>

\</div\>



### **Skills Database Structure**

The **skills database** stores **user-generated skills** that are
**dynamically tagged** with **goals** and **industries**. Each skill is
associated with an **industry** and **goal**.

**Example Structure**:

\[

{

\"id\": \"1\",

\"skill\": \"Product Management\",

\"category\": \"Tech & Software\",

\"tags\": \[\"Product & Service Development\"\]

},

{

\"id\": \"2\",

\"skill\": \"SEO\",

\"category\": \"Marketing & Advertising\",

\"tags\": \[\"Growth & Expansion\"\]

},

{

\"id\": \"3\",

\"skill\": \"UI/UX Design\",

\"category\": \"Tech & Software\",

\"tags\": \[\"Design & Strategy\"\]

}

\]


