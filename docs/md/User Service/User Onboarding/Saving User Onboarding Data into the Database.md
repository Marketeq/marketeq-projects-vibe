## **Saving User Onboarding Data into the Database**

### **Purpose**

This document outlines the steps to save user onboarding data into the
database, ensuring that the data is stored in the **existing fields** of
the **User Service**. Developers should **not create new fields** unless
absolutely necessary (i.e., if the field does not already exist). The
data should be saved via the **User Service** as part of the
**microservices architecture**.\
\
This process ensures that **user onboarding data** is stored in the
**existing fields** of the **User Service** without creating new fields
unless absolutely necessary. By integrating it within the
**microservices architecture** and following proper validation, you
ensure consistency and scalability as the system grows.

### **Key Requirements**

1.  **Use Existing Fields**: Ensure that the data is saved into the
    pre-existing fields in the database (i.e., the fields already
    defined in the **User Service**).

2.  **No New Fields**: New fields should only be created if they **do
    not already exist** in the database schema. Any changes to the
    schema (like adding new fields) should be approved and coordinated
    with the backend team.

3.  **Microservices Architecture**: The data should be saved via the
    **User Service** as part of the **User Microservice**.

4.  **Data Validation**: Ensure that data validation and transformation
    are handled before saving to the database, and make sure the
    integrity of the data is preserved.

### **Steps to Save Onboarding Data**

#### **1. Identify the User Service**

The **User Service** is responsible for handling user-related data,
including their profile, settings, and onboarding information. It is
part of the overall **microservices architecture**.

Ensure you are working with the existing **User Service** to handle user
data and that all data is saved through the **User Service API**.

#### **2. Verify Existing Fields in the Database**

Before saving any data, make sure the fields you\'re planning to save
already exist in the database. You can do this by referring to the
current schema of the **User Service**.

Here's a reference to the core fields (for example purposes) that are
usually included in the user data model:

@Entity()

export class User {

\@PrimaryGeneratedColumn()

id: number;

\@Column()

username: string;

\@Column()

email: string;

\@Column()

industry: string;

\@Column()

businessGoals: string\[\];

\@Column()

role: string;

\@Column({ nullable: true })

teamName: string;

\@Column({ nullable: true })

inviteCode: string;

// Add any other existing fields relevant to onboarding data

}

#### **3. Backend API Integration for Saving Onboarding Data**

The data collected during the user's onboarding process (such as
**industry**, **business goals**, **role**, and **team name**) will be
sent to the **User Service**.

Create an API endpoint in the **User Service** to handle saving the
onboarding data. The endpoint should update the relevant user profile
with the data.

**Sample API Endpoint (NestJS)**:

import { Controller, Post, Body, Param } from \'@nestjs/common\';

import { UserService } from \'./user.service\';

import { UpdateUserDto } from \'./dto/update-user.dto\';

\@Controller(\'users\')

export class UserController {

constructor(private readonly userService: UserService) {}

\@Post(\':userId/onboarding\')

async saveOnboardingData(@Param(\'userId\') userId: string, \@Body()
onboardingData: UpdateUserDto) {

// Validate data if necessary (you can also handle validation in the
DTO)

return await this.userService.saveOnboardingData(userId,
onboardingData);

}

}

**Sample DTO (Data Transfer Object)**:

export class UpdateUserDto {

username: string;

email: string;

industry: string;

businessGoals: string\[\];

role: string;

teamName?: string;

inviteCode?: string;

}

#### **4. Save Data in the Database**

In the **User Service**, the saveOnboardingData method should ensure the
data is saved into the **existing fields** of the database. If the field
doesn\'t exist, then it should be added to the model (this needs
approval and migration if it\'s a new field).

**Sample Service Method**:

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { User } from \'./user.entity\';

import { UpdateUserDto } from \'./dto/update-user.dto\';

\@Injectable()

export class UserService {

constructor(

\@InjectRepository(User)

private readonly userRepository: Repository\<User\>,

) {}

async saveOnboardingData(userId: string, onboardingData: UpdateUserDto):
Promise\<User\> {

// Find user by ID

const user = await this.userRepository.findOne(userId);

if (!user) {

throw new Error(\'User not found\');

}

// Update user with the onboarding data (only existing fields)

user.username = onboardingData.username \|\| user.username;

user.email = onboardingData.email \|\| user.email;

user.industry = onboardingData.industry \|\| user.industry;

user.businessGoals = onboardingData.businessGoals \|\|
user.businessGoals;

user.role = onboardingData.role \|\| user.role;

user.teamName = onboardingData.teamName \|\| user.teamName;

user.inviteCode = onboardingData.inviteCode \|\| user.inviteCode;

// Save updated user data into the database

return this.userRepository.save(user);

}

}

#### **5. Data Validation and Transformation**

Ensure the data is properly validated before saving it to the database.
For example:

- **Industry**: Validate if the industry is one of the available
  options.

- **Business Goals**: Ensure goals are in a valid format (array or
  string).

- **Email**: Use an email validator to ensure the input is valid.

**Example of Validation in DTO**:

import { IsEmail, IsString, IsArray, ArrayNotEmpty } from
\'class-validator\';

export class UpdateUserDto {

\@IsString()

username: string;

\@IsEmail()

email: string;

\@IsString()

industry: string;

\@IsArray()

\@ArrayNotEmpty()

businessGoals: string\[\];

\@IsString()

role: string;

\@IsString()

teamName?: string;

\@IsString()

inviteCode?: string;

}

#### **6. Ensure Microservices Integration**

Make sure the **User Service** is integrated properly into your
**microservices architecture**. The **User Service** should be
responsible for saving onboarding data and must follow the
microservice\'s standards.

If other services (e.g., **Authentication Service**, **Notification
Service**) need to interact with the user data, make sure they are using
the appropriate APIs and communication channels.

### **Testing and Validation**

- **Unit Tests**: Test the saveOnboardingData method to ensure it saves
  the correct data into the database.

- **Integration Tests**: Ensure that the **User Service** API is
  receiving onboarding data correctly and saving it in the existing
  fields.

- **Performance Testing**: As the user base grows, monitor the
  performance of the database and API to ensure that the saving process
  remains efficient.
