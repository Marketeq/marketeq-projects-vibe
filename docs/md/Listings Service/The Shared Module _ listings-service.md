**🔁 shared/ Module -- listings-service\
\**
The shared/ module (inside each microservice, like
listings-service/shared) is used to **store common code or constants**
that are reused across multiple feature modules **within that service**.

### **🔍 Here\'s what you typically put in a shared/ folder:**

  --------------------------------------------------------------------
  **File Type**  **Purpose**
  -------------- -----------------------------------------------------
  constants.ts   Common values like statuses (draft, published,
                 flagged)

  enums.ts       Reusable enums (e.g., ListingType, ExperienceLevel)

  validators/    Custom class validators (e.g., IsValidCategory())

  pipes/         NestJS pipes like ParseUUIDPipe or SanitizeInputPipe

  guards/        Auth guards or role checks shared by multiple
                 controllers

  utils/         Pure helper functions used across multiple services

  dto/           Global DTOs (only if reused across modules ---
                 otherwise, keep local)
  --------------------------------------------------------------------

### **✅ Example: status.constants.ts**

****export const LISTING_STATUSES = {

DRAFT: \'draft\',

PUBLISHED: \'published\',

FLAGGED: \'flagged\',

};

Then you can import it in projects.service.ts, services.service.ts,
etc. to keep things consistent.

### **🧠 Why it matters:**

- Keeps duplication low

- Makes it easier to update validation/status rules in one place

- Keeps your modules focused (no bloated services or controllers)

Here's a boilerplate shared/ module for your listings-service --- ready
to drop into your repo:

## **📁 apps/listings-service/src/modules/shared/ Folder Structure**

****shared/

├── constants/

│ ├── listing-status.constants.ts

│ └── listing-types.constants.ts

├── enums/

│ └── listing-type.enum.ts

├── pipes/

│ └── sanitize-input.pipe.ts

├── validators/

│ └── is-valid-category.validator.ts

├── guards/

│ └── roles.guard.ts

├── utils/

│ └── slugify.ts



## **🧱 Sample Code Snippets**

### **listing-status.constants.ts**

****export const LISTING_STATUSES = {

DRAFT: \'draft\',

PUBLISHED: \'published\',

FLAGGED: \'flagged\',

} as const;

export type ListingStatus = typeof LISTING_STATUSES\[keyof typeof
LISTING_STATUSES\];



### **listing-types.constants.ts**

****export const LISTING_TYPES = \[\'project\', \'job\', \'service\',
\'team\'\];



### **listing-type.enum.ts**

****export enum ListingType {

Project = \'project\',

Job = \'job\',

Service = \'service\',

Team = \'team\',

}



### **sanitize-input.pipe.ts**

****import { PipeTransform, Injectable } from \'@nestjs/common\';

import sanitizeHtml from \'sanitize-html\';

\@Injectable()

export class SanitizeInputPipe implements PipeTransform {

transform(value: any) {

return typeof value === \'string\' ? sanitizeHtml(value) : value;

}

}



### **is-valid-category.validator.ts**

****import {

ValidatorConstraint,

ValidatorConstraintInterface,

} from \'class-validator\';

\@ValidatorConstraint({ name: \'isValidCategory\', async: false })

export class IsValidCategory implements ValidatorConstraintInterface {

validate(value: string) {

const allowedCategories = \[\'Development\', \'Design\',
\'Marketing\'\];

return allowedCategories.includes(value);

}

defaultMessage() {

return \'Invalid category\';

}

}



### **roles.guard.ts**

****import { CanActivate, ExecutionContext, Injectable } from
\'@nestjs/common\';

\@Injectable()

export class RolesGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const req = context.switchToHttp().getRequest();

return req.user?.role === \'admin\'; // Simple example

}

}



### **slugify.ts**

****export function slugify(text: string): string {

return text

.toLowerCase()

.replace(/\[\^a-z0-9\]+/g, \'-\')

.replace(/(\^-\|-\$)+/g, \'\');

}



This shared folder helps you stay DRY and enforces reusable logic across
projects, services, jobs, and teams.
