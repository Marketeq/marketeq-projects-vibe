## **🔁 shared/ Module -- user-service**

The shared/ module inside the **user-service** exists to centralize and
reuse logic across all features like **Talent Profiles**, **Team
Profiles**, user roles, and user metadata. It keeps things clean, DRY,
and easy to maintain.

### **🔍 Here\'s what you typically put in a shared/ folder (for user-service):**

+----------------+-------------------------------------------------------+
| > **File       | > **Purpose**                                         |
| > Type**       |                                                       |
+----------------+-------------------------------------------------------+
| > constants.ts | > Common values like profile status (pending,         |
|                | > approved, flagged)                                  |
+----------------+-------------------------------------------------------+
| > enums.ts     | > Reusable enums (e.g., UserRole, AccountType,        |
|                | > ProfileVisibility)                                  |
+----------------+-------------------------------------------------------+
| > validators/  | > Custom class validators (e.g., IsValidUsername(),   |
|                | > IsCountryCode())                                    |
+----------------+-------------------------------------------------------+
| > pipes/       | > NestJS pipes like SanitizeProfilePipe, TrimPipe,    |
|                | > NormalizeCasePipe                                   |
+----------------+-------------------------------------------------------+
| > guards/      | > Auth or ownership guards shared across Talent,      |
|                | > Team, and Settings                                  |
+----------------+-------------------------------------------------------+
| > utils/       | > Utility functions like generateUsername(),          |
|                | > slugifyName()                                       |
+----------------+-------------------------------------------------------+
| > dto/         | > Shared DTOs used across modules (e.g., BaseUserDto, |
|                | > PaginatedDto)                                       |
+================+=======================================================+

### **✅ Example: profile-status.constants.ts**

- ****export const PROFILE_STATUSES = {

- PENDING: \'pending\',

- APPROVED: \'approved\',

- FLAGGED: \'flagged\',

- };

You can import this in talent-profile.service.ts,
team-profile.service.ts, or any controller/service that relies on status
logic.

### **🧠 Why it matters for user-service:**

- ✅ **Keeps duplication low** (no rewriting enums, constants, or guards
  in every module)

- 🛠 **Centralizes logic** for things like name validation, country code
  checking, and profile visibility

- 🔐 **Secures access** using consistent guards and role checks

- 🚀 **Futureproofs your code** --- one change in shared/ updates all
  dependent modules

Here's your boilerplate **shared/ module for the user-service**,
covering reusable logic for **Talent Profiles**, **Team Profiles**, and
more.

## **📁 apps/user-service/src/modules/shared/ Folder Structure**

****shared/

├── constants/

│ ├── profile-status.constants.ts

│ └── countries.constants.ts

├── enums/

│ └── user-role.enum.ts

├── pipes/

│ └── sanitize-profile.pipe.ts

├── validators/

│ └── is-valid-name.validator.ts

├── guards/

│ └── owner.guard.ts

├── utils/

│ └── generate-username.ts



## **🧱 Sample Code Snippets**

### **profile-status.constants.ts**

****export const PROFILE_STATUSES = {

PENDING: \'pending\',

APPROVED: \'approved\',

FLAGGED: \'flagged\',

};



### **countries.constants.ts**

****export const ALLOWED_COUNTRIES = \[\'US\', \'UK\', \'CA\', \'IN\',
\'DE\', \'BR\', \'PH\'\];



### **user-role.enum.ts**

****export enum UserRole {

Client = \'client\',

Contractor = \'contractor\',

Admin = \'admin\',

}



### **sanitize-profile.pipe.ts**

****import { PipeTransform, Injectable } from \'@nestjs/common\';

import sanitizeHtml from \'sanitize-html\';

\@Injectable()

export class SanitizeProfilePipe implements PipeTransform {

transform(value: any) {

if (typeof value === \'string\') {

return sanitizeHtml(value, {

allowedTags: \[\],

allowedAttributes: {},

});

}

return value;

}

}



### **is-valid-name.validator.ts**

****import { ValidatorConstraint, ValidatorConstraintInterface } from
\'class-validator\';

\@ValidatorConstraint({ name: \'isValidName\', async: false })

export class IsValidName implements ValidatorConstraintInterface {

validate(name: string) {

return /\^\[a-zA-Z\]\[a-zA-Z0-9\_\]{2,14}\$/.test(name); // 3--15 chars,
no special symbols

}

defaultMessage() {

return \'Username must be 3--15 characters and contain only letters,
numbers, or underscores\';

}

}



### **owner.guard.ts**

****import { CanActivate, ExecutionContext, Injectable } from
\'@nestjs/common\';

\@Injectable()

export class OwnerGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const req = context.switchToHttp().getRequest();

const userId = req.user?.id;

const resourceOwnerId = req.params?.userId \|\| req.body?.userId;

return userId === resourceOwnerId;

}

}



### **generate-username.ts**

****export function generateUsername(name: string): string {

return (

name.toLowerCase().replace(/\\s+/g, \'\_\') +

\'\_\' +

Math.floor(1000 + Math.random() \* 9000)

);

}



This keeps all your reusable profile logic consistent and modular across
TalentProfile, TeamProfile, and any future user-facing features.

Let me know if you want me to bundle both shared modules into .zip or
.docx for team distribution.
