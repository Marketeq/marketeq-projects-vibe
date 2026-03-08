### **Document 3: Filter Logic & Categories**

#### **Overview:**

This document outlines the filtering logic applied to various types of
content in the **Content Moderation Microservice**. The filters are
applied to ensure that content complies with platform guidelines. The
filtering system uses a modular approach to handle different content
types and field types, ensuring scalability and easy updates to the
moderation logic.\
\
The **Filter Logic & Categories** document outlines the logic for
validating various content types and fields, including profanity checks,
banned keywords, file validations, and category/subcategory checks. The
filtering system is built to be modular and easily customizable,
allowing for the dynamic addition of new filters and content rules.

#### **1. Content Type Filters**

The **Content Moderation Microservice** processes multiple content
types. Each content type may have different filter rules and validation
processes, which are applied to ensure consistency and compliance with
platform guidelines.

1.  **Project**:

    - **Title Validation**: Ensures the title does not contain profanity
      or invalid keywords.

    - **Description Validation**: Ensures that the description contains
      no banned words or inappropriate content.

    - **Tags**: Validates tags against the list of approved tags to
      ensure relevance and compliance.

2.  **Review**:

    - **Text Validation**: Checks for profanity, spam, and inappropriate
      content.

    - **Rating Validation**: Ensures that ratings are within valid
      ranges (e.g., 1-5 stars).

3.  **Profile**:

    - **Bio Text**: Ensures that bios do not contain contact information
      or prohibited links (e.g., social media links, personal email).

    - **Skills & Roles**: Ensures that selected roles and skills are
      valid by checking them against predefined categories.

4.  **Service**:

    - **Service Description**: Validates the service description to
      ensure it is appropriate and free of banned content.

    - **Pricing**: Ensures that the pricing provided falls within
      predefined valid ranges.

5.  **Job Posting**:

    - **Job Title**: Ensures that the title does not contain
      inappropriate or banned keywords.

    - **Job Description**: Validates the job description for compliance
      with platform rules.

#### **2. Field-Level Filters**

Filters are applied to specific fields within each content type. For
instance, when a user enters a **project title**, that field will be
validated according to a set of rules. The system ensures that invalid
or harmful input is rejected at the field level.

**Field-level filters include**:

- **Profanity Filters**:

  - **Logic**: Uses regular expressions or third-party APIs (e.g., **Bad
    Words List**, **Google Perspective API**) to scan text for offensive
    language.

  - **Code Example**:

import \* as badWords from \'bad-words\'; // Example library for
profanity filtering

const filter = new badWords();

const isValid = filter.clean(content) === content;

if (!isValid) {

return { status: \'rejected\', reason: \'Profanity detected\' };

}

- \
  **Banned Keywords**:

  - **Logic**: Scans the content for keywords that are restricted by the
    platform (e.g., adult content, hate speech).

  - **Code Example**:

const bannedKeywords = \[\'adult\', \'violence\', \'hate\'\];

const containsBannedKeyword = bannedKeywords.some(keyword =\>
content.includes(keyword));

if (containsBannedKeyword) {

return { status: \'rejected\', reason: \'Banned keyword detected\' };

}

- \
  **Length Validation**:

  - **Logic**: Ensures that the length of the input (e.g., title,
    description) falls within acceptable ranges.

  - **Code Example**:

const titleLength = content.title.length;

if (titleLength \< 5 \|\| titleLength \> 120) {

return { status: \'rejected\', reason: \'Title length invalid\' };

}

- \
  **File Size & Type Validation for Media**:

  - **Logic**: Ensures that uploaded media files are of the correct type
    (e.g., .jpg, .mp4) and do not exceed size limits.

  - **Code Example**:

const allowedFileTypes = \[\'image/jpeg\', \'image/png\',
\'video/mp4\'\];

const maxSize = 10 \* 1024 \* 1024; // 10MB

if (!allowedFileTypes.includes(file.type) \|\| file.size \> maxSize) {

return { status: \'rejected\', reason: \'Invalid file type or size\' };

}



#### **3. Filter Customization & Management**

Filters need to be easily customizable to handle new content types or
field types. As the platform evolves, additional filters may be
required. The **Content Moderation Microservice** supports dynamic
filter management, allowing admins to update or add new filters without
requiring code changes.

- **Dynamic Filter Management**:

  - **Add/Remove Keywords**: Admins can add new banned keywords or
    modify the existing ones through an admin interface or API.

  - **Code Example** (Admin API for adding banned keywords):

@Post(\'admin/keywords\')

async addBannedKeyword(@Body() newKeyword: string) {

// Add to database or in-memory list of banned keywords

await this.keywordService.add(newKeyword);

return { status: \'success\', message: \'Banned keyword added\' };

}

- \
  **Adjusting Filter Sensitivity**:

  - **Code Example** (Adjusting profanity filter threshold):

// Adjust sensitivity of profanity filter (e.g., more lenient or
strict)

const profanityFilter = new badWords({ placeHolder: \'\*\' });

if (sensitivity === \'strict\') {

profanityFilter.removeWords(\[\'bad\', \'worst\'\]);

}



#### **4. Category and Subcategory Filters**

Content categories and subcategories must be validated to ensure that
users select valid and appropriate options. This includes checking that
the chosen subcategories belong to the correct parent category.

- **Category Validation**:

  - **Logic**: Ensures that users select valid categories (e.g., Design,
    Development).

  - **Code Example**:

const validCategories = \[\'Design\', \'Development\', \'Marketing\'\];

if (!validCategories.includes(content.category)) {

return { status: \'rejected\', reason: \'Invalid category\' };

}

- \
  **Subcategory Validation**:

  - **Logic**: Ensures that the subcategory selected is valid for the
    chosen category.

  - **Code Example**:

const subcategories = {

\'Design\': \[\'UI/UX\', \'Graphic Design\'\],

\'Development\': \[\'Frontend\', \'Backend\'\]

};

if (!subcategories\[content.category\]?.includes(content.subcategory)) {

return { status: \'rejected\', reason: \'Invalid subcategory\' };

}


