# **DOCUMENT 02 -- FAVORITES -- DATABASE SCHEMA & MIGRATIONS**

PURPOSE\
Define and apply the Postgres schema for favorites and favorite_groups.
You'll create TypeORM entities, write migrations, and run them---no
guessing.

PREREQUISITES\
• Document 01 completed (service shell with TypeORM installed)\
• \@nestjs/typeorm, typeorm, pg in package.json

## **DIRECTORY STRUCTURE**

****apps/favorites-service/

├─ src/

│ ├─ entities/

│ │ ├─ favorite-group.entity.ts

│ │ └─ favorite.entity.ts

│ ├─ migrations/

│ │ └─ 1687660000000-CreateFavoritesTables.ts

│ └─ \...

├─ ormconfig.ts

└─ package.json

STEP 1 -- Install TypeORM CLI Tools\
From apps/favorites-service:

npm install \--save-dev ts-node typeorm

STEP 2 -- Configure TypeORM CLI\
Create apps/favorites-service/ormconfig.ts:

import { DataSource } from \'typeorm\';

import { FavoriteGroup } from \'./src/entities/favorite-group.entity\';

import { Favorite } from \'./src/entities/favorite.entity\';

export default new DataSource({

type: \'postgres\',

url: process.env.DATABASE_URL,

entities: \[FavoriteGroup, Favorite\],

migrations: \[\'src/migrations/\*.ts\'\],

synchronize: false,

});

Add these scripts to package.json:

\"scripts\": {

// existing...

\"migration:generate\": \"ts-node -r tsconfig-paths/register
node_modules/typeorm/cli.js migration:generate\",

\"migration:run\": \"ts-node -r tsconfig-paths/register
node_modules/typeorm/cli.js migration:run\"

}

STEP 3 -- Define Entities\
Create src/entities/favorite-group.entity.ts:

import {

Entity,

PrimaryGeneratedColumn,

Column,

CreateDateColumn,

UpdateDateColumn,

OneToMany,

Index,

} from \'typeorm\';

import { Favorite } from \'./favorite.entity\';

\@Entity({ name: \'favorite_groups\' })

export class FavoriteGroup {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column({ length: 100 })

name: string;

\@Index()

\@Column(\'uuid\')

userId: string;

\@OneToMany(() =\> Favorite, (fav) =\> fav.group, { cascade: true })

favorites: Favorite\[\];

\@CreateDateColumn()

createdAt: Date;

\@UpdateDateColumn()

updatedAt: Date;

}

Create src/entities/favorite.entity.ts:

import {

Entity,

PrimaryGeneratedColumn,

Column,

ManyToOne,

CreateDateColumn,

Index,

} from \'typeorm\';

import { FavoriteGroup } from \'./favorite-group.entity\';

export enum FavoriteType {

TALENT = \'talent\',

PROJECT = \'project\',

SERVICE = \'service\',

JOB = \'job\',

TEAM = \'team\',

}

\@Entity({ name: \'favorites\' })

export class Favorite {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Index()

\@Column(\'uuid\')

userId: string;

\@Index()

\@Column(\'uuid\')

groupId: string;

\@ManyToOne(() =\> FavoriteGroup, (group) =\> group.favorites, {
onDelete: \'CASCADE\' })

group: FavoriteGroup;

\@Column({ type: \'enum\', enum: FavoriteType })

type: FavoriteType;

\@Column({ length: 100 })

itemId: string;

\@CreateDateColumn()

createdAt: Date;

}

STEP 4 -- Generate Migration\
Run (include a name; timestamp will prefix the file):

npm run migration:generate \-- -n CreateFavoritesTables

This creates src/migrations/1687660000000-CreateFavoritesTables.ts.
Confirm it contains:

import { MigrationInterface, QueryRunner, Table, TableForeignKey } from
\'typeorm\';

export class CreateFavoritesTables1687660000000 implements
MigrationInterface {

public async up(queryRunner: QueryRunner): Promise\<void\> {

// favorite_groups

await queryRunner.createTable(

new Table({

name: \'favorite_groups\',

columns: \[

{ name: \'id\', type: \'uuid\', isPrimary: true, generationStrategy:
\'uuid\', default: \'uuid_generate_v4()\' },

{ name: \'name\', type: \'varchar\', length: \'100\', isNullable: false
},

{ name: \'userId\', type: \'uuid\', isNullable: false },

{ name: \'createdAt\', type: \'timestamp\', default: \'now()\' },

{ name: \'updatedAt\', type: \'timestamp\', default: \'now()\' },

\],

}),

true,

);

// favorites

await queryRunner.createTable(

new Table({

name: \'favorites\',

columns: \[

{ name: \'id\', type: \'uuid\', isPrimary: true, generationStrategy:
\'uuid\', default: \'uuid_generate_v4()\' },

{ name: \'userId\', type: \'uuid\', isNullable: false },

{ name: \'groupId\', type: \'uuid\', isNullable: false },

{ name: \'type\', type: \'enum\', enum:
\[\'talent\',\'project\',\'service\',\'job\',\'team\'\], isNullable:
false },

{ name: \'itemId\', type: \'varchar\', length: \'100\', isNullable:
false },

{ name: \'createdAt\', type: \'timestamp\', default: \'now()\' },

\],

}),

true,

);

// foreign key: favorites.groupId → favorite_groups.id

await queryRunner.createForeignKey(

\'favorites\',

new TableForeignKey({

columnNames: \[\'groupId\'\],

referencedTableName: \'favorite_groups\',

referencedColumnNames: \[\'id\'\],

onDelete: \'CASCADE\',

}),

);

}

public async down(queryRunner: QueryRunner): Promise\<void\> {

await queryRunner.dropTable(\'favorites\', true);

await queryRunner.dropTable(\'favorite_groups\', true);

}

}

STEP 5 -- Run Migrations

npm run migration:run

Verify tables exist:

\\d favorite_groups

\\d favorites

YOUR DATABASE IS READY\
• Tables favorite_groups and favorites created\
• Proper indexes and foreign key in place\
• TypeORM entities mapped
