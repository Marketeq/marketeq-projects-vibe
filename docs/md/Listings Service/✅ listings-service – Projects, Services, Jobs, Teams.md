# **✅ listings-service -- Projects, Services, Jobs, Teams**

## **📁 FILE STRUCTURE**

****apps/

└── listings-service/

└── src/

└── modules/

├── jobs/

├── projects/

├── services/

├── teams/

└── shared/

Each module includes:

├── dto/

│ ├── create-xxx.dto.ts

│ └── update-xxx.dto.ts

├── entities/

│ └── xxx.entity.ts

├── xxx.controller.ts

├── xxx.service.ts

└── xxx.module.ts



## **🔧 DATABASE MODEL (PostgreSQL via TypeORM)**

All listings share these fields:

  ---------------------------------------------------------
  **Field**     **Type**     **Description**
  ------------- ------------ ------------------------------
  id            UUID         Primary key

  title         string       Listing title

  description   text         Full body text

  category      string       Predefined category from CMS

  skills        string\[\]   List of associated skills

  tags          string\[\]   Searchable tags

  industry      string\[\]   Selected industries

  status        string       draft \| published \| flagged

  createdBy     UUID         ID of user or team that owns
                             the listing

  createdAt     Date         Timestamp

  updatedAt     Date         Timestamp
  ---------------------------------------------------------

Example --- project.entity.ts:

@Entity()

export class Project {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

title: string;

\@Column(\'text\')

description: string;

\@Column()

category: string;

\@Column(\"text\", { array: true })

skills: string\[\];

\@Column(\"text\", { array: true })

tags: string\[\];

\@Column(\"text\", { array: true })

industry: string\[\];

\@Column({ default: \'draft\' })

status: \'draft\' \| \'published\' \| \'flagged\';

\@Column()

createdBy: string;

\@CreateDateColumn()

createdAt: Date;

\@UpdateDateColumn()

updatedAt: Date;

}



## **🚀 CONTROLLER ROUTES**

Each listing type (jobs, projects, services, teams) follows the same
REST endpoints:

  ----------------------------------------------------------
  **Method**   **Endpoint**    **Purpose**
  ------------ --------------- -----------------------------
  GET          /projects       Get all published projects

  GET          /projects/:id   Get one project by ID

  POST         /projects       Create a new project

  PUT          /projects/:id   Update a project

  DELETE       /projects/:id   Delete a project (soft delete
                               preferred)
  ----------------------------------------------------------

Same for:

- /jobs

- /services

- /teams

Example --- projects.controller.ts:

@Controller(\'projects\')

export class ProjectsController {

constructor(private readonly projectsService: ProjectsService) {}

\@Get()

findAll() {

return this.projectsService.findAll();

}

\@Get(\':id\')

findOne(@Param(\'id\') id: string) {

return this.projectsService.findOne(id);

}

\@Post()

create(@Body() dto: CreateProjectDto, \@Req() req) {

return this.projectsService.create(dto, req.user.id);

}

\@Put(\':id\')

update(@Param(\'id\') id: string, \@Body() dto: UpdateProjectDto) {

return this.projectsService.update(id, dto);

}

\@Delete(\':id\')

delete(@Param(\'id\') id: string) {

return this.projectsService.delete(id);

}

}



## **📥 SERVICE LAYER LOGIC**

Use TypeORM repository pattern:

@Injectable()

export class ProjectsService {

constructor(

\@InjectRepository(Project)

private repo: Repository\<Project\>,

) {}

async findAll() {

return this.repo.find({ where: { status: \'published\' } });

}

async findOne(id: string) {

return this.repo.findOne({ where: { id } });

}

async create(dto: CreateProjectDto, userId: string) {

const data = this.repo.create({ \...dto, createdBy: userId });

return this.repo.save(data);

}

async update(id: string, dto: UpdateProjectDto) {

await this.repo.update(id, dto);

return this.findOne(id);

}

async delete(id: string) {

return this.repo.delete(id);

}

}



## **🔍 SEARCH INTEGRATION (via search-service)**

When publishing a listing, send to search-service:

// Inside ProjectsService

async publishToSearch(project: Project) {

const payload = {

id: project.id,

type: \'project\',

title: project.title,

description: project.description,

tags: project.tags,

skills: project.skills,

category: project.category,

industry: project.industry,

};

await this.httpService.post(\'http://search-service/index\',
payload).toPromise();

}



## **✅ REQUIRED CONFIGS**

- Environment variables:

  - DATABASE_URL

  - JWT_SECRET

  - API_GATEWAY_URL

- Add route to API Gateway (example):

// routes.config.ts

{

path: \'/projects\',

target: \'http://listings-service:3000/projects\',

methods: \[\'GET\', \'POST\', \'PUT\', \'DELETE\'\]

}



## **🔐 AUTH & OWNERSHIP**

- Each create/update/delete must verify JWT and user role

- Only owner can update/delete

- Admins can flag listings (moderation service)
