**User Settings -- Time & Date Preferences (NestJS Backend)\
\**
**Feature Scope:\**
Allow each user to set and store their personal preferences for:

- Time zone

- Date format (MM/DD/YYYY or DD/MM/YYYY)

- Start of the week (Sunday or Monday)

- Time format (12-hour or 24-hour clock)

These settings are stored in the users table and returned via the /me
endpoint for frontend use. The frontend applies these preferences to all
displayed timestamps. The backend **does not** perform date conversions
--- it stores all dates in UTC.

**Step 1 -- Update Database Schema**

Modify the users table in your database:

1.  Open your User entity (user.entity.ts)

2.  Add the following fields to the class:

@Column({ default: \'UTC\' })

timezone: string;

\@Column({ default: \'MM/DD/YYYY\' })

dateFormat: string;

\@Column({ default: \'Sunday\' })

startOfWeek: \'Sunday\' \| \'Monday\';

\@Column({ default: \'12h\' })

timeFormat: \'12h\' \| \'24h\';

3.  Run a new migration to apply these changes:

- Generate:\
  npx typeorm migration:generate -n AddUserTimeSettings

- Run:\
  npx typeorm migration:run

**Step 2 -- Create DTO for Updating Preferences**

1.  Create a file: src/users/dto/update-user-settings.dto.ts

2.  Add the following content:

import { IsIn, IsOptional, IsString } from \'class-validator\';

export class UpdateUserSettingsDto {

\@IsOptional()

\@IsString()

timezone?: string;

\@IsOptional()

\@IsIn(\[\'MM/DD/YYYY\', \'DD/MM/YYYY\'\])

dateFormat?: \'MM/DD/YYYY\' \| \'DD/MM/YYYY\';

\@IsOptional()

\@IsIn(\[\'Sunday\', \'Monday\'\])

startOfWeek?: \'Sunday\' \| \'Monday\';

\@IsOptional()

\@IsIn(\[\'12h\', \'24h\'\])

timeFormat?: \'12h\' \| \'24h\';

}



**Step 3 -- Add Update Endpoint to Controller**

1.  Open users.controller.ts

2.  Add the endpoint below:

@Put(\'settings\')

\@UseGuards(AuthGuard)

async updateUserSettings(@Req() req, \@Body() dto:
UpdateUserSettingsDto) {

const userId = req.user.id;

return this.usersService.updateUserSettings(userId, dto);

}

This route is protected and will only work for authenticated users.

**Step 4 -- Add Logic to User Service**

1.  Open users.service.ts

2.  Add the following method:

async updateUserSettings(userId: string, dto: UpdateUserSettingsDto) {

await this.userRepository.update({ id: userId }, dto);

return this.userRepository.findOneBy({ id: userId });

}

This will update only the provided fields and return the updated user
object.

**Step 5 -- Make Settings Available in the /me API**

1.  If not already present, ensure your /me endpoint returns all the new
    fields:

{

id,

name,

email,

timezone,

dateFormat,

startOfWeek,

timeFormat,

\...

}

2.  Frontend will use this data to format all timestamps locally (e.g.,
    screenshot grid, time summaries).

**Step 6 -- Frontend Integration Guide (Preview)\**
(Handled in a later integration doc, but outline for reference)

- Display dropdowns or selectors for:

  - Timezone (preloaded list)

  - Date Format (radio buttons)

  - Start of Week (Sunday / Monday toggle)

  - Time Format (12h / 24h)

- On submit, send a PUT request to /api/users/settings with the selected
  values.

- Apply settings globally using a frontend context or global store.

**Security & Defaults**

- This endpoint must only be accessible by the user themselves.

- All values must be validated using DTOs.

- Backend must store timestamps in UTC, not in user-preferred format.
