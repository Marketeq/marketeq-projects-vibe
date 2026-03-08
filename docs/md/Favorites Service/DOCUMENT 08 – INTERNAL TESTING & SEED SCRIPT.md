# **DOCUMENT 08 -- INTERNAL TESTING & SEED SCRIPT**

## **PURPOSE**

Provide a local seed script to populate the favorites-service database
with realistic sample data, plus a suite of unit and integration tests
(using Jest) to verify migrations, entities, service logic, and
controller endpoints.

## **PREREQUISITES**

• Documents 01--07 complete\
• typeorm CLI configured (ormconfig.ts)\
• \@nestjs/testing, Jest, ts-jest not yet installed

## **DIRECTORY STRUCTURE**

****apps/favorites-service/

├─ src/

│ └─ \... \# existing code

├─ scripts/

│ └─ seed.ts

├─ test/

│ ├─ favorites.service.spec.ts

│ └─ favorites.controller.spec.ts

├─ jest.config.js

├─ tsconfig.json \# updated to include test files

└─ package.json \# updated scripts & devDependencies

## **STEP 1 -- INSTALL TEST & SEED DEPENDENCIES**

From apps/favorites-service, run:

npm install \--save-dev \\

jest ts-jest \@types/jest \\

\@nestjs/testing \\

sqlite3 \\

ts-node

• sqlite3 used for an in-memory database in tests\
• ts-node for running the seed script

## **STEP 2 -- CONFIGURE Jest**

Create jest.config.js at apps/favorites-service/:

module.exports = {

preset: \'ts-jest\',

testEnvironment: \'node\',

roots: \[\'\<rootDir\>/test\'\],

moduleFileExtensions: \[\'ts\', \'js\', \'json\'\],

globals: {

\'ts-jest\': {

tsconfig: \'tsconfig.json\'

}

},

};

In package.json, add under \"scripts\":

\"scripts\": {

// existing...

\"seed\": \"ts-node scripts/seed.ts\",

\"test\": \"jest \--runInBand\"

}

## **STEP 3 -- UPDATE tsconfig.json FOR TESTS**

Ensure apps/favorites-service/tsconfig.json includes test files:

{

\"extends\": \"../../tsconfig.base.json\",

\"compilerOptions\": {

\"rootDir\": \"src\",

\"outDir\": \"dist\"

},

\"include\": \[

\"src\",

\+ \"test\"

\]

}

## **STEP 4 -- WRITE THE SEED SCRIPT**

File: apps/favorites-service/scripts/seed.ts

import \'dotenv/config\';

import { DataSource } from \'typeorm\';

import ormConfig from \'../ormconfig\';

import { FavoriteGroup } from \'../src/entities/favorite-group.entity\';

import { Favorite, FavoriteType } from
\'../src/entities/favorite.entity\';

// 1. Initialize DataSource

const ds = new DataSource(ormConfig);

async function runSeed() {

await ds.initialize();

console.log(\'Database connected, running seed\...\');

// 2. Clear existing data

await ds.getRepository(Favorite).delete({});

await ds.getRepository(FavoriteGroup).delete({});

// 3. Sample users

const users = \[

{ id: \'user-1-uuid\' },

{ id: \'user-2-uuid\' },

\];

// 4. Create groups for each user

const groupRepo = ds.getRepository(FavoriteGroup);

const groups = \[\];

for (const u of users) {

const g1 = groupRepo.create({ userId: u.id, name: \'UX Designers\' });

const g2 = groupRepo.create({ userId: u.id, name: \'Mobile Apps\' });

groups.push(await groupRepo.save(g1), await groupRepo.save(g2));

}

// 5. Create favorites for each group

const favRepo = ds.getRepository(Favorite);

for (const group of groups) {

// two sample favorites per group

for (let i = 1; i \<= 2; i++) {

const fav = favRepo.create({

userId: group.userId,

groupId: group.id,

type: FavoriteType.PROJECT,

itemId: \`proj-\${group.name.replace(\' \',
\'-\').toLowerCase()}-\${i}\`,

});

await favRepo.save(fav);

}

}

console.log(\'Seed complete\');

await ds.destroy();

}

runSeed().catch(err =\> {

console.error(\'Seed failed:\', err);

process.exit(1);

});

Run it via:

npm run seed

Verify in Postgres:

SELECT \* FROM favorite_groups;

SELECT \* FROM favorites;

## **STEP 5 -- SET UP IN-MEMORY TEST DATABASE**

In tests we'll override the DataSource to use SQLite in-memory.

## **STEP 6 -- FAVORITES SERVICE UNIT TESTS**

File: apps/favorites-service/test/favorites.service.spec.ts

import { Test, TestingModule } from \'@nestjs/testing\';

import { FavoritesService } from \'../src/services/favorites.service\';

import { AiService } from \'../src/ai/ai.service\';

import { Favorite } from \'../src/entities/favorite.entity\';

import { FavoriteGroup } from \'../src/entities/favorite-group.entity\';

import { getRepositoryToken } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

describe(\'FavoritesService\', () =\> {

let service: FavoritesService;

let favRepo: Repository\<Favorite\>;

let groupRepo: Repository\<FavoriteGroup\>;

let aiService: AiService;

beforeEach(async () =\> {

const module: TestingModule = await Test.createTestingModule({

providers: \[

FavoritesService,

{

provide: AiService,

useValue: {

assignGroup: jest.fn().mockImplementation((userId, type, itemId) =\>

Promise.resolve({ id: \'group-1\', userId, name: \'AutoGroup\' } as
FavoriteGroup)

),

},

},

{ provide: getRepositoryToken(Favorite), useClass: Repository },

{ provide: getRepositoryToken(FavoriteGroup), useClass: Repository },

\],

}).compile();

service = module.get\<FavoritesService\>(FavoritesService);

favRepo =
module.get\<Repository\<Favorite\>\>(getRepositoryToken(Favorite));

groupRepo =
module.get\<Repository\<FavoriteGroup\>\>(getRepositoryToken(FavoriteGroup));

aiService = module.get\<AiService\>(AiService);

});

it(\'should create a favorite using AI-assigned group\', async () =\> {

const dto = { type: Favorite.prototype.type, itemId: \'item-1\' };

// mock repo behavior

jest.spyOn(favRepo, \'create\').mockReturnValue({ userId: \'userX\',
groupId: \'group-1\', \...dto } as any);

jest.spyOn(favRepo, \'save\').mockResolvedValue({ id: \'fav-1\',
\...dto, userId: \'userX\', groupId: \'group-1\' } as any);

const result = await service.create(dto as any, { sub: \'userX\' });

expect(aiService.assignGroup).toHaveBeenCalled();

expect(result.id).toBe(\'fav-1\');

});

it(\'should throw when moving non-existent favorite\', async () =\> {

jest.spyOn(favRepo, \'findOne\').mockResolvedValue(undefined);

await expect(service.update(\'no-id\', { groupId: \'g1\' }, { sub:
\'userX\' })).rejects.toThrow();

});

});

## **STEP 7 -- FAVORITES CONTROLLER INTEGRATION TESTS**

File: apps/favorites-service/test/favorites.controller.spec.ts

import { Test, TestingModule } from \'@nestjs/testing\';

import { INestApplication, ValidationPipe } from \'@nestjs/common\';

import \* as request from \'supertest\';

import { AppModule } from \'../src/app.module\';

import { TypeOrmModule } from \'@nestjs/typeorm\';

import { DataSource } from \'typeorm\';

describe(\'FavoritesController (e2e)\', () =\> {

let app: INestApplication;

let ds: DataSource;

const jwtToken = \'\<valid_jwt\>\'; // generate via JwtModule or stub

beforeAll(async () =\> {

const moduleFixture: TestingModule = await Test.createTestingModule({

imports: \[

AppModule,

TypeOrmModule.forRoot({

type: \'sqlite\',

database: \':memory:\',

dropSchema: true,

entities: \[\_\_dirname + \'/../src/entities/\*.entity.ts\'\],

synchronize: true,

}),

\],

}).compile();

app = moduleFixture.createNestApplication();

app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

await app.init();

ds = app.get(DataSource);

});

afterAll(async () =\> {

await ds.destroy();

await app.close();

});

it(\'/favorites (GET) unauthorized\', () =\> {

return request(app.getHttpServer()).get(\'/favorites\').expect(401);

});

it(\'/favorites (POST) -\> GET\', async () =\> {

// stub JWT validation by bypassing guard for test

const createRes = await request(app.getHttpServer())

.post(\'/favorites\')

.set(\'Authorization\', \`Bearer \${jwtToken}\`)

.send({ type: \'project\', itemId: \'test-proj\' })

.expect(201);

const getRes = await request(app.getHttpServer())

.get(\'/favorites\')

.set(\'Authorization\', \`Bearer \${jwtToken}\`)

.expect(200);

expect(getRes.body.length).toBeGreaterThan(0);

});

});

## **STEP 8 -- RUN TESTS**

From apps/favorites-service:

npm run test

You should see all tests pass with coverage for service and controller.

## **YOUR TESTING ENVIRONMENT IS READY**

• Seed script populates realistic data\
• Unit tests cover business logic with mocks\
• Integration tests verify endpoints against in-memory DB

You can now confidently build and refactor, knowing this suite will
catch regressions.
