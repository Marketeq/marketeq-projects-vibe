# **DOCUMENT 06 -- FAVORITES LOGIC -- PER LISTING TYPE**

PURPOSE\
Refine the AI metadata extraction for each favoriteable listing type so
embeddings use the right fields. You'll implement fetchItemMetadata in
AiService to handle:

• PROJECT and SERVICE\
• TALENT and TEAM\
• JOB

PREREQUISITES\
• Documents 01--05 complete\
• External modules available: ProjectModule, ServiceModule,
TalentModule, TeamModule, JobModule\
• Each external module exposes a getMetadata(id: string) method
returning { title: string; skills: string\[\] }

## **DIRECTORY STRUCTURE**

****apps/favorites-service/

└─ src/

├─ ai/

│ └─ ai.service.ts ← update here

├─ project/ ← existing external service

│ └─ project.service.ts

├─ service/

│ └─ service.service.ts

├─ talent/

│ └─ talent.service.ts

├─ team/

│ └─ team.service.ts

└─ job/

└─ job.service.ts

STEP 1 -- Define the Metadata Interface\
In src/ai/ai.service.ts before the class, add:

interface ItemMetadata {

title: string;

skills: string\[\];

}

STEP 2 -- Inject External Services\
Modify AiService constructor signature to include each:

constructor(

private config: ConfigService,

\@InjectRepository(FavoriteGroup)

private groupRepo: Repository\<FavoriteGroup\>,

private projectService: ProjectService,

private serviceService: ServiceService,

private talentService: TalentService,

private teamService: TeamService,

private jobService: JobService,

) { /\* existing init \*/ }

Also update src/ai/ai.module.ts imports:

imports: \[

ConfigModule,

TypeOrmModule.forFeature(\[FavoriteGroup\]),

ProjectModule,

ServiceModule,

TalentModule,

TeamModule,

JobModule,

\],

STEP 3 -- Implement fetchItemMetadata\
Replace the stub in AiService with:

private async fetchItemMetadata(

type: FavoriteType,

itemId: string,

): Promise\<ItemMetadata\> {

switch (type) {

case FavoriteType.PROJECT:

return this.projectService.getMetadata(itemId);

case FavoriteType.SERVICE:

return this.serviceService.getMetadata(itemId);

case FavoriteType.TALENT:

return this.talentService.getMetadata(itemId);

case FavoriteType.TEAM:

// team may have multiple members; combine member titles and logos

const team = await this.teamService.findById(itemId);

const skills = team.members

.flatMap((m) =\> m.skills)

.filter((v, i, a) =\> a.indexOf(v) === i);

return {

title: team.name,

skills,

};

case FavoriteType.JOB:

return this.jobService.getMetadata(itemId);

default:

throw new BadRequestException(\`Unknown favorite type: \${type}\`);

}

}

STEP 4 -- Ensure External Services Provide getMetadata\
Each external service must implement getMetadata:

Example for ProjectService (project/project.service.ts):

@Injectable()

export class ProjectService {

constructor(

\@InjectRepository(Project)

private projRepo: Repository\<Project\>,

) {}

async getMetadata(id: string): Promise\<ItemMetadata\> {

const project = await this.projRepo.findOne({ where: { id } });

if (!project) throw new NotFoundException(\'Project not found\');

return {

title: project.title,

skills: project.tags \|\| project.skills \|\| \[\],

};

}

}

Implement analogous getMetadata in ServiceService and JobService:

@Injectable()

export class ServiceService {

async getMetadata(id: string): Promise\<ItemMetadata\> {

const svc = await this.svcRepo.findOne({ where: { id } });

if (!svc) throw new NotFoundException(\'Service not found\');

return {

title: svc.title,

skills: svc.tags \|\| \[\],

};

}

}



@Injectable()

export class JobService {

async getMetadata(id: string): Promise\<ItemMetadata\> {

const job = await this.jobRepo.findOne({ where: { id } });

if (!job) throw new NotFoundException(\'Job not found\');

return {

title: job.title,

skills: job.requiredSkills \|\| \[\],

};

}

}

STEP 5 -- Update AiService import statements\
At top of src/ai/ai.service.ts add:

import { ProjectService } from \'../project/project.service\';

import { ServiceService } from \'../service/service.service\';

import { TalentService } from \'../talent/talent.service\';

import { TeamService } from \'../team/team.service\';

import { JobService } from \'../job/job.service\';

STEP 6 -- Test Per-Type Grouping

1.  Seed sample items for each type in respective tables.

2.  Call POST /favorites with:\
    • type=project & projectId\
    • type=service & serviceId\
    • type=talent & talentId\
    • type=team & teamId\
    • type=job & jobId

3.  Verify AI selects or creates groups with relevant titles:\
    • "Mobile App" group for a mobile project\
    • "Backend API" group for a service\
    • "Senior UX Designer" group for a talent\
    • "Engineering Team" group for a team\
    • "Marketing Manager" group for a job

With this in place, your AI grouping logic uses the correct metadata per
listing type.
