### **Document 13: Banned Keyword & Profanity Filter Integration**

#### **Overview:**

This document outlines how to integrate **banned keyword** and
**profanity filters** into the **Content Moderation Microservice**. It
describes the **exact steps** and **code snippets** required to
implement these filters in the backend, ensuring that any project
submitted to the marketplace is checked for inappropriate language
before approval.

The filters will be applied to **text-based content** (e.g., title,
description, tags, skills) and will **reject any submission** containing
words or phrases that violate the platform\'s community guidelines.

#### **1. Overview of Filters**

The **banned keyword** and **profanity filters** are designed to check
text content for offensive or harmful language. These filters will
inspect:

- **Profanity**: A list of commonly recognized offensive words and
  phrases.

- **Banned Keywords**: Specific keywords or phrases that are not allowed
  (e.g., hate speech, adult content).

These filters will be implemented using two main approaches:

1.  **In-built libraries** (e.g., bad-words library) for profanity.

2.  **Custom keyword list** for platform-specific banned terms.

#### **2. Steps to Integrate Banned Keyword & Profanity Filters**

##### **2.1. Install Necessary Libraries**

To integrate **bad-words** for profanity filtering and implement custom
keyword bans, you\'ll need to install the following packages:

npm install bad-words

##### **2.2. Profanity Filter Integration**

Use the bad-words package to detect profane words in any text field.
Here\'s how to integrate it into the **Project Validation Service**.

import \* as Filter from \'bad-words\'; // Import bad-words library

import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class ProjectValidationService {

private profanityFilter = new Filter();

// Function to validate text for profanity

validateTextForProfanity(text: string): boolean {

return !this.profanityFilter.isProfane(text); // Returns true if clean,
false if contains profanity

}

}

##### **2.3. Banned Keyword Filter Integration**

In addition to **profanity**, you\'ll need to filter out **specific
banned keywords**. You can maintain a **list of banned keywords** that
are considered inappropriate, and this list will be checked during
content validation.

@Injectable()

export class ProjectValidationService {

private bannedKeywords = \[\'violence\', \'hate\', \'porn\',
\'abuse\'\]; // Example banned keywords

// Function to validate text for banned keywords

validateTextForBannedKeywords(text: string): boolean {

return !this.bannedKeywords.some(keyword =\> text.includes(keyword)); //
Returns true if no banned keywords found

}

}

##### **2.4. Full Text Validation Process**

Integrate both the **profanity filter** and the **banned keyword
filter** to ensure that the text is clean before it is accepted. Here's
the combined validation function:

@Injectable()

export class ProjectValidationService {

private profanityFilter = new Filter();

private bannedKeywords = \[\'violence\', \'hate\', \'porn\',
\'abuse\'\];

validateProjectContent(text: string): boolean {

if (this.profanityFilter.isProfane(text)) {

return false; // Reject if profanity is detected

}

if (this.bannedKeywords.some(keyword =\> text.includes(keyword))) {

return false; // Reject if any banned keyword is found

}

return true; // Approve if clean

}

}



#### **3. Testing the Banned Keyword & Profanity Filters**

##### **3.1. Unit Testing for Profanity Filter**

To ensure the **profanity filter** is working correctly, you need to
create **unit tests** that verify it detects profanity and rejects the
content accordingly.

import { Test, TestingModule } from \'@nestjs/testing\';

import { ProjectValidationService } from
\'./project-validation.service\';

describe(\'Profanity Filter\', () =\> {

let service: ProjectValidationService;

beforeEach(async () =\> {

const module: TestingModule = await Test.createTestingModule({

providers: \[ProjectValidationService\],

}).compile();

service =
module.get\<ProjectValidationService\>(ProjectValidationService);

});

it(\'should reject text with profanity\', () =\> {

const text = \'This is a badword project\';

expect(service.validateProjectContent(text)).toBeFalsy(); // Should
reject

});

it(\'should accept clean text\', () =\> {

const text = \'This is a clean project\';

expect(service.validateProjectContent(text)).toBeTruthy(); // Should
accept

});

});

##### **3.2. Unit Testing for Banned Keyword Filter**

Similar to the profanity filter, you'll test the **banned keyword
filter** to ensure that it catches prohibited words in the content.

describe(\'Banned Keyword Filter\', () =\> {

let service: ProjectValidationService;

beforeEach(async () =\> {

const module: TestingModule = await Test.createTestingModule({

providers: \[ProjectValidationService\],

}).compile();

service =
module.get\<ProjectValidationService\>(ProjectValidationService);

});

it(\'should reject text with banned keywords\', () =\> {

const text = \'This project is about hate speech\';

expect(service.validateProjectContent(text)).toBeFalsy(); // Should
reject

});

it(\'should accept clean text\', () =\> {

const text = \'This project is about building an app\';

expect(service.validateProjectContent(text)).toBeTruthy(); // Should
accept

});

});



#### **4. Integrating Banned Keyword & Profanity Filters into Project Submission Flow**

The **Listing Microservice** will call the **ProjectValidationService**
to validate all fields of a project before it is submitted. If any of
the fields fail the validation, the project will be **rejected**.

##### **4.1. Example Submission Flow with Filters**

****\@Injectable()

export class ProjectService {

constructor(private readonly projectValidationService:
ProjectValidationService) {}

async submitProject(createProjectDto: any): Promise\<any\> {

// Validate title, description, tags, and skills

if
(!this.projectValidationService.validateProjectContent(createProjectDto.title)
\|\|

!this.projectValidationService.validateProjectContent(createProjectDto.description)
\|\|

!this.projectValidationService.validateProjectContent(createProjectDto.tags.join(\'
\')) \|\|

!this.projectValidationService.validateProjectContent(createProjectDto.skills.join(\'
\'))) {

return { status: \'rejected\', message: \'Project content contains
prohibited language.\' };

}

// If the content is valid, save the project

await this.projectRepository.save(createProjectDto);

return { status: \'approved\', message: \'Project submitted
successfully.\' };

}

}



#### **5. Conclusion**

This document provides a comprehensive guide to implementing **banned
keyword** and **profanity filters** in the **Content Moderation
Microservice**. It ensures that all **text fields** (title, description,
tags, skills) are correctly validated against profanity and banned
keywords before a project is published. The integration includes **full
code examples**, **test cases**, and **step-by-step instructions** to
ensure that developers can follow the process without ambiguity.
