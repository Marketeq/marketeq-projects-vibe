# **🧾 Talent Profile -- user-service Documentation**

> This module allows contractors to manage their public-facing **Talent
> Profile**, which appears in search results but is owned and stored
> under user-service.

## **📁 File Structure**

****apps/user-service/

├── src/

│ ├── modules/

│ │ └── talent-profile/

│ │ ├── controllers/

│ │ │ └── talent-profile.controller.ts

│ │ ├── services/

│ │ │ └── talent-profile.service.ts

│ │ ├── dto/

│ │ │ ├── create-talent-profile.dto.ts

│ │ │ └── update-talent-profile.dto.ts

│ │ ├── entities/

│ │ │ └── talent-profile.entity.ts

│ │ ├── interfaces/

│ │ │ └── talent-profile.interface.ts

│ │ └── talent-profile.module.ts



## **📦 Entity: talent-profile.entity.ts**

****import { Column, Entity, PrimaryGeneratedColumn } from \'typeorm\';

\@Entity(\'talent_profiles\')

export class TalentProfile {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

displayName: string;

\@Column({ nullable: true })

bio: string;

\@Column(\"text\", { array: true, default: \[\] })

skills: string\[\];

\@Column(\"text\", { array: true, default: \[\] })

industries: string\[\];

\@Column()

country: string;

\@Column({ nullable: true })

city: string;

\@Column({ default: \'pending\' })

status: \'pending\' \| \'approved\' \| \'flagged\';

\@Column({ type: \'float\', default: 0 })

clientSuccessRating: number;

\@Column({ type: \'int\', default: 0 })

completedProjects: number;

\@Column({ type: \'timestamp\', default: () =\> \'CURRENT_TIMESTAMP\' })

createdAt: Date;

\@Column({ type: \'timestamp\', default: () =\> \'CURRENT_TIMESTAMP\' })

updatedAt: Date;

}



## **📥 DTOs**

### **create-talent-profile.dto.ts**

****import { IsNotEmpty, IsString, IsArray, IsOptional } from
\'class-validator\';

export class CreateTalentProfileDto {

\@IsString()

\@IsNotEmpty()

displayName: string;

\@IsOptional()

\@IsString()

bio?: string;

\@IsArray()

skills: string\[\];

\@IsArray()

industries: string\[\];

\@IsString()

country: string;

\@IsOptional()

\@IsString()

city?: string;

}

### **update-talent-profile.dto.ts**

****import { PartialType } from \'@nestjs/mapped-types\';

import { CreateTalentProfileDto } from \'./create-talent-profile.dto\';

export class UpdateTalentProfileDto extends
PartialType(CreateTalentProfileDto) {}



## **🧠 Service: talent-profile.service.ts**

****\@Injectable()

export class TalentProfileService {

constructor(

\@InjectRepository(TalentProfile)

private repo: Repository\<TalentProfile\>,

) {}

async create(userId: string, dto: CreateTalentProfileDto):
Promise\<TalentProfile\> {

const profile = this.repo.create({ \...dto, userId });

return this.repo.save(profile);

}

async findByUserId(userId: string): Promise\<TalentProfile\> {

return this.repo.findOne({ where: { userId } });

}

async update(userId: string, dto: UpdateTalentProfileDto):
Promise\<TalentProfile\> {

const profile = await this.findByUserId(userId);

Object.assign(profile, dto);

return this.repo.save(profile);

}

async approve(userId: string) {

const profile = await this.findByUserId(userId);

profile.status = \'approved\';

return this.repo.save(profile);

}

}



## **📡 Controller: talent-profile.controller.ts**

****\@UseGuards(AuthGuard)

\@Controller(\'talent-profile\')

export class TalentProfileController {

constructor(private readonly service: TalentProfileService) {}

\@Post()

create(@Req() req, \@Body() dto: CreateTalentProfileDto) {

return this.service.create(req.user.id, dto);

}

\@Get()

get(@Req() req) {

return this.service.findByUserId(req.user.id);

}

\@Patch()

update(@Req() req, \@Body() dto: UpdateTalentProfileDto) {

return this.service.update(req.user.id, dto);

}

\@Post(\'approve/:userId\')

\@UseGuards(AdminGuard)

approve(@Param(\'userId\') userId: string) {

return this.service.approve(userId);

}

}



## **🔗 Sample API Endpoints**

  ---------------------------------------------------------------------
  **Method**   **Endpoint**                      **Description**
  ------------ --------------------------------- ----------------------
  POST         /talent-profile                   Create a new profile

  GET          /talent-profile                   Get current user's
                                                 profile

  PATCH        /talent-profile                   Update current user's
                                                 profile

  POST         /talent-profile/approve/:userId   Approve a profile
                                                 (admin)
  ---------------------------------------------------------------------

## **✅ Search Integration**

Once profiles are created and approved, your **search indexing service
(e.g., Algolia)** can listen to profile creation or update events and
index the following:

- displayName

- skills

- industries

- bio

- country and city

- clientSuccessRating

- completedProjects
