# **DOCUMENT 05 -- AI GROUP MATCHING -- HUGGING FACE INTEGRATION**

PURPOSE\
Implement semantic grouping logic using a Hugging Face embedding model.
This will power "auto-group" assignment: if an incoming favorite doesn't
closely match any existing group, a new one is created with a meaningful
title.

PREREQUISITES\
• Documents 01--04 complete\
• A working Hugging Face account or self-hosted inference endpoint (any
HF API or local server)\
• Environment variable HUGGINGFACE_API_KEY (for HF hosted inference) or
HUGGINGFACE_URL (for self-hosted)

DEPENDENCIES\
From apps/favorites-service install the HF inference client and utility
library:

npm install \@huggingface/inference cosine-similarity

(Add cosine-similarity or any simple vector math package of your
choosing.)

DIRECTORY STRUCTURE

apps/favorites-service/

└─ src/

├─ ai/

│ ├─ ai.module.ts

│ └─ ai.service.ts ← updated here

├─ entities/

│ ├─ favorite-group.entity.ts

│ └─ favorite.entity.ts

└─ services/

└─ favorites.service.ts ← consumes AiService

STEP 1 -- Configure HF Client\
Edit src/ai/ai.service.ts:

import { Injectable, BadRequestException } from \'@nestjs/common\';

import { HfInference } from \'@huggingface/inference\';

import \* as cosine from \'cosine-similarity\';

import { ConfigService } from \'@nestjs/config\';

import { Repository } from \'typeorm\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

import { FavoriteType } from \'../entities/favorite.entity\';

const MODEL_ID = \'sentence-transformers/all-MiniLM-L6-v2\';

const SIMILARITY_THRESHOLD = 0.75;

\@Injectable()

export class AiService {

private hf: HfInference;

constructor(

private config: ConfigService,

\@InjectRepository(FavoriteGroup)

private groupRepo: Repository\<FavoriteGroup\>,

) {

const apiKey = this.config.get\<string\>(\'HUGGINGFACE_API_KEY\');

const url = this.config.get\<string\>(\'HUGGINGFACE_URL\');

this.hf = new HfInference(apiKey ? { apiKey } : { inferenceEndpoint: url
});

}

private async embed(text: string): Promise\<number\[\]\> {

const result = await this.hf.featureExtraction({

model: MODEL_ID,

inputs: text,

});

// HF returns \[ \[vector\] \] for single input

return Array.isArray(result) && Array.isArray(result\[0\]) ? result\[0\]
: \[\];

}

private async fetchItemMetadata(

type: FavoriteType,

itemId: string,

): Promise\<{ title: string; skills: string\[\] }\> {

// Stub: replace with calls to your own services/DB

// e.g. for projects: call ProjectService.getById(itemId)

// Return at least a title and an array of key skills/categories

throw new BadRequestException(\'fetchItemMetadata not implemented\');

}

async assignGroup(

userId: string,

type: FavoriteType,

itemId: string,

): Promise\<FavoriteGroup\> {

// 1. Get text to embed

const { title, skills } = await this.fetchItemMetadata(type, itemId);

const textToEmbed = \`\${title} \${skills.join(\' \')}\`.trim();

if (!textToEmbed) {

throw new BadRequestException(\'Insufficient item metadata for AI
grouping\');

}

// 2. Embed incoming item

const itemVec = await this.embed(textToEmbed);

// 3. Load user's existing groups

const groups = await this.groupRepo.find({ where: { userId } });

// 4. Embed each group name and compute similarity

let bestMatch: { group: FavoriteGroup; score: number } = null;

for (const group of groups) {

const groupVec = await this.embed(group.name);

const score = cosine(itemVec, groupVec);

if (score \> (bestMatch?.score \|\| 0)) {

bestMatch = { group, score };

}

}

// 5. If best match passes threshold, return it

if (bestMatch && bestMatch.score \>= SIMILARITY_THRESHOLD) {

return bestMatch.group;

}

// 6. Otherwise create a new group

// Use the most descriptive label: prefer title over skills

const newGroupName = title \|\| skills\[0\] \|\| \'Favorites\';

const newGroup = this.groupRepo.create({ userId, name: newGroupName });

return this.groupRepo.save(newGroup);

}

}

STEP 2 -- Stub fetchItemMetadata\
Implement fetchItemMetadata in AiService with real calls:

private async fetchItemMetadata(

type: FavoriteType,

itemId: string,

): Promise\<{ title: string; skills: string\[\] }\> {

switch (type) {

case FavoriteType.PROJECT:

case FavoriteType.SERVICE:

return this.projectService.getMetadata(itemId);

case FavoriteType.TALENT:

case FavoriteType.TEAM:

return this.talentService.getMetadata(itemId);

case FavoriteType.JOB:

return this.jobService.getMetadata(itemId);

default:

throw new BadRequestException(\'Unknown favorite type\');

}

}

Inject ProjectService, TalentService, JobService into AiService via the
constructor.

STEP 3 -- Update Module Registration\
Ensure AiModule exports AiService and imports any external service
modules:

// src/ai/ai.module.ts

import { Module } from \'@nestjs/common\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { ConfigModule } from \'@nestjs/config\';

import { FavoriteGroup } from \'../entities/favorite-group.entity\';

import { AiService } from \'./ai.service\';

import { ProjectModule } from \'../project/project.module\';

import { TalentModule } from \'../talent/talent.module\';

import { JobModule } from \'../job/job.module\';

\@Module({

imports: \[

ConfigModule,

TypeOrmModule.forFeature(\[FavoriteGroup\]),

ProjectModule,

TalentModule,

JobModule,

\],

providers: \[AiService\],

exports: \[AiService\],

})

export class AiModule {}

STEP 4 -- Environment Variables\
Add to .env:

HUGGINGFACE_API_KEY=\<your_api_key\>

\# or if self-hosted:

HUGGINGFACE_URL=http://localhost:8000

STEP 5 -- Test AI Assignment

1.  Seed one group manually:

INSERT INTO favorite_groups (id, name, \"userId\") VALUES
(\'1111-\...\', \'UX Designers\', \'user-123\');

2.  \
    Call the endpoint to favorite an item with known metadata:

curl -X POST http://localhost:4003/favorites \\

-H \"Authorization: Bearer \<token\>\" \\

-H \"Content-Type: application/json\" \\

-d \'{\"type\":\"project\",\"itemId\":\"project-123\"}\'

3.  \
    Observe whether it is attached to "UX Designers" or created a new
    group.

AI GROUP MATCHING COMPLETE\
You now have a pluggable, cost-effective semantic grouping
implementation.
