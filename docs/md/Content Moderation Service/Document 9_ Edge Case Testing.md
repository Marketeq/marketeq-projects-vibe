### **Document 9: Edge Case Testing**

#### **Overview:**

This document describes how to handle **edge case testing** in the
**Content Moderation Microservice**, ensuring that the system behaves
correctly under rare or unusual conditions. Edge case testing ensures
that the **content moderation filters**, including **media checks**,
**profanity filters**, and **banned keywords**, function properly even
when faced with unusual inputs.

This document provides **step-by-step instructions** and **test cases**
for identifying and handling edge cases in the moderation system.\
\
Edge case testing is essential to ensure that the **content moderation
system** handles all unusual, incorrect, or malformed inputs gracefully.
The tests outlined in this document provide the necessary coverage to
validate that the system can reject or flag inappropriate content,
handle large or unusual media files, and perform correctly under various
edge case scenarios.

By automating the edge case tests and addressing all potential corner
cases, the **Content Moderation Microservice** will be robust and
resilient to unexpected user input or edge scenarios.

#### **1. Objective**

The purpose of **edge case testing** is to ensure that the **content
moderation system** correctly handles:

- **Unusual characters or formatting** in text fields.

- **Corrupted or invalid image/video files**.

- **Unexpected content types**.

- **Large data submissions** (e.g., lengthy descriptions or multiple
  media files).

- **High-frequency requests** to simulate potential abuse or errors.

The goal is to ensure that the system is **robust** and **secure**
against all possible edge cases, preventing errors that could disrupt
moderation.

#### **2. Edge Case Testing Scenarios**

Here are common edge cases to test for each **content moderation
filter**:

##### **2.1. Profanity Filter Edge Cases**

- **Test Case 1**: Submitting text with **hidden profanity** (e.g.,
  **\"badword\"** with spaces or special characters in between, such as
  \"b a d w o r d\").

- **Test Case 2**: Submitting **multiple languages** containing
  profanity or slurs.

- **Test Case 3**: Submitting **valid** words that **resemble**
  profanity (e.g., \"freaking\" or \"sucks\").

##### **2.2. Banned Keywords Filter Edge Cases**

- **Test Case 4**: Submitting keywords that are **misspelled** but still
  recognizable as banned terms (e.g., \"violence\" vs. \"voolence\").

- **Test Case 5**: Using **keywords in non-English languages** (ensure
  multi-language support).

- **Test Case 6**: Submitting keywords in **different encodings** (e.g.,
  Unicode characters or HTML encoding).

##### **2.3. Media Moderation Edge Cases**

- **Test Case 7**: Uploading **corrupted or unsupported image files**
  (e.g., **.webp** or a **broken image**).

- **Test Case 8**: Uploading **extremely large media files** (e.g., a
  100MB+ video).

- **Test Case 9**: Uploading **animated images** or **videos with no
  clear boundaries** (e.g., GIFs or animations).

- **Test Case 10**: Uploading **blurred** or **low-quality** images that
  may pass the initial checks but should fail due to insufficient
  clarity.

##### **2.4. Combined Edge Cases (All Content Types)**

- **Test Case 11**: Submitting a **project** with **empty required
  fields** or **invalid characters**.

- **Test Case 12**: Submitting a project with **long strings** or
  **excessive whitespace** in any of the fields (e.g., title,
  description, tags).

- **Test Case 13**: Submitting **duplicate tags** or **categories** in
  the project.

#### **3. Edge Case Test Scenarios for Each Content Type**

##### **3.1. Text Validation Edge Cases**

Test **text validation** for all fields (title, description, tags) by
testing the system\'s ability to **reject** or **flag** these cases:

1.  **Invisible or space-based profanity** (e.g., \"b a d w o r d\").

2.  **Very large text input** (e.g., 5,000+ characters for a
    description).

3.  **Text with foreign language profanity** (e.g., Spanish, German,
    etc.).

4.  **HTML or script injections** in fields like project description or
    tags.

5.  **Random symbols** that could mimic normal text (e.g., &#100; or
    special Unicode characters).

##### **3.2. Media Validation Edge Cases**

Test **media validation** using the following edge cases:

1.  **Non-image or unsupported files** (e.g., submitting a .txt file as
    an image).

2.  **Empty or zero-byte media files**.

3.  **Low-resolution or blurred images** that could pass media checks
    but should be flagged.

4.  **Extreme aspect ratios or unsupported video resolutions**.

5.  **Multiple media files** (e.g., submitting 10+ images or videos in
    one submission).

##### **3.3. Combined Edge Case Test Cases**

Test for **combined edge cases**, ensuring the system can handle a mix
of content types:

1.  **A project with empty fields** (e.g., missing title or
    description).

2.  **An incomplete media submission** (image without description).

3.  **Combining all types of invalid input** (e.g., a project with bad
    text, invalid tags, and corrupted media files).

4.  **High-frequency submissions** to test rate limiting or abuse (e.g.,
    multiple submissions in a short time).

#### **4. Automating Edge Case Tests**

Edge cases should be automated using unit and integration tests. Use
**Jest** or **Mocha** for backend tests, ensuring the system can handle
each edge case.

##### **4.1. Example: Profanity Filter Edge Case Test**

****import { Test, TestingModule } from \'@nestjs/testing\';

import { ProjectValidationService } from
\'./project-validation.service\';

describe(\'Profanity Filter Edge Case Test\', () =\> {

let service: ProjectValidationService;

beforeEach(async () =\> {

const module: TestingModule = await Test.createTestingModule({

providers: \[ProjectValidationService\],

}).compile();

service =
module.get\<ProjectValidationService\>(ProjectValidationService);

});

it(\'should reject text with hidden profanity\', () =\> {

const text = \'b a d w o r d\';

expect(service.validateText(text)).toBeFalsy(); // Should fail due to
hidden profanity

});

});

##### **4.2. Example: Media File Edge Case Test**

****import { Test, TestingModule } from \'@nestjs/testing\';

import { MediaModerationService } from \'./media-moderation.service\';

describe(\'Media Moderation Edge Case Test\', () =\> {

let service: MediaModerationService;

beforeEach(async () =\> {

const module: TestingModule = await Test.createTestingModule({

providers: \[MediaModerationService\],

}).compile();

service = module.get\<MediaModerationService\>(MediaModerationService);

});

it(\'should reject unsupported media file types\', async () =\> {

const media = \'path_to_unsupported_file.txt\';

const result = await service.validateMedia(media);

expect(result.status).toBe(\'rejected\'); // Should reject unsupported
file

});

});


