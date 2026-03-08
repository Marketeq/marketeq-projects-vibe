# **02 - Strapi ↔ NestJS Marketplace Category Sync -- Developer Implementation Guide**

## **1. Overview**

This document provides complete implementation code and setup
instructions to integrate marketplace category and tag synchronization
between **Strapi CMS** and the **NestJS backend**, using:

- Unlimited category nesting

- Universal UUIDs

- Real-time webhooks + fallback cron sync

- Hybrid SEO (automatic with optional overrides)

- Auto-approval workflow

## **2. NestJS Setup**

### **a. Create Category Entity**

/apps/marketeq-nestjs/src/categories/category.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany,
CreateDateColumn, UpdateDateColumn } from \'typeorm\';

import { Tag } from \'../tags/tag.entity\';

\@Entity(\'categories\')

export class Category {

\@PrimaryGeneratedColumn()

id: number;

\@Column({ unique: true })

uuid: string;

\@Column()

name: string;

\@Column({ unique: true })

slug: string;

\@Column({ nullable: true })

description: string;

\@Column({ nullable: true })

parent_id: string;

\@OneToMany(() =\> Category, cat =\> cat.parent)

children: Category\[\];

\@ManyToOne(() =\> Category, cat =\> cat.children)

parent: Category;

\@OneToMany(() =\> Tag, tag =\> tag.category)

tags: Tag\[\];

\@Column({ default: false })

published_in_marketplace: boolean;

\@Column({ default: false })

approved: boolean;

\@Column({ nullable: true })

seo_meta_title: string;

\@Column({ nullable: true })

seo_meta_description: string;

\@CreateDateColumn()

created_at: Date;

\@UpdateDateColumn()

updated_at: Date;

}



### **b. Create DTOs**

/apps/marketeq-nestjs/src/categories/dto/category.dto.ts

export class CategoryDto {

uuid: string;

name: string;

slug: string;

description?: string;

parent_id?: string;

tags?: string\[\];

approved?: boolean;

published_in_marketplace?: boolean;

seo_meta_title?: string;

seo_meta_description?: string;

}



### **c. Category Service**

/apps/marketeq-nestjs/src/categories/category.service.ts

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Category } from \'./category.entity\';

import { CategoryDto } from \'./dto/category.dto\';

import axios from \'axios\';

\@Injectable()

export class CategoryService {

constructor(

\@InjectRepository(Category)

private readonly categoryRepo: Repository\<Category\>

) {}

async syncFromStrapi(dto: CategoryDto) {

let category = await this.categoryRepo.findOne({ where: { uuid: dto.uuid
} });

if (!category) {

category = this.categoryRepo.create();

category.uuid = dto.uuid;

}

Object.assign(category, dto);

await this.categoryRepo.save(category);

}

async pushToStrapi(category: Category) {

const payload = {

uuid: category.uuid,

name: category.name,

slug: category.slug,

parent: category.parent_id,

approved: category.approved,

published_in_marketplace: category.published_in_marketplace,

seo_meta_title: category.seo_meta_title \|\| null,

seo_meta_description: category.seo_meta_description \|\| null,

tags: category.tags?.map(t =\> t.uuid),

};

await axios.post(\`\${process.env.STRAPI_URL}/categories\`, payload, {

headers: { Authorization: \`Bearer \${process.env.STRAPI_TOKEN}\` },

});

}

}



### **d. Controller**

/apps/marketeq-nestjs/src/categories/category.controller.ts

import { Controller, Post, Body } from \'@nestjs/common\';

import { CategoryService } from \'./category.service\';

import { CategoryDto } from \'./dto/category.dto\';

\@Controller(\'categories\')

export class CategoryController {

constructor(private readonly categoryService: CategoryService) {}

\@Post(\'sync\')

async syncCategory(@Body() dto: CategoryDto) {

await this.categoryService.syncFromStrapi(dto);

return { status: \'ok\' };

}

}



### **e. Cron Job**

/apps/marketeq-nestjs/src/categories/category.cron.ts

import { Cron, CronExpression } from \'@nestjs/schedule\';

import { Injectable } from \'@nestjs/common\';

import axios from \'axios\';

import { CategoryService } from \'./category.service\';

\@Injectable()

export class CategoryCron {

constructor(private readonly categoryService: CategoryService) {}

\@Cron(CronExpression.EVERY_10_MINUTES)

async syncCategories() {

const res = await axios.get(\`\${process.env.STRAPI_URL}/categories\`);

for (const cat of res.data) {

await this.categoryService.syncFromStrapi(cat);

}

}

}



## **3. Strapi Setup**

### **a. Create Category Content-Type**

- Use the Strapi admin panel to create fields matching the NestJS model:

  - uuid (UID)

  - name

  - slug

  - description

  - parent (relation to self)

  - tags (relation to Tag)

  - published_in_marketplace

  - approved

  - seo_meta_title

  - seo_meta_description

### **b. Webhooks**

- Create a webhook in Strapi:

  - **Events:** Create, Update, Delete on Category

  - **Target URL:** https://nest.api/categories/sync

## **4. Dynamic SEO Defaults (Next.js)**

/pages/categories/\[slug\].tsx

import { useRouter } from \'next/router\';

import Head from \'next/head\';

export default function CategoryPage({ category }) {

const title = category.seo_meta_title \|\| \`Browse \${category.name}
Projects & Talent\`;

const description = category.seo_meta_description \|\| \`Find top
services, teams, and jobs in \${category.name}.\`;

return (

\<\>

\<Head\>

\<title\>{title}\</title\>

\<meta name=\"description\" content={description} /\>

\</Head\>

\<h1\>{category.name}\</h1\>

{/\* Render listings \*/}

\</\>

);

}



## **5. Testing Checklist**

- ✅ Create category in Strapi → Syncs to NestJS

- ✅ Create subcategory in NestJS → Pushes to Strapi

- ✅ Auto-approved subcategories are unpublished but approved

- ✅ Cron sync catches missed updates

- ✅ SEO defaults apply to new categories without overrides

- ✅ Optional meta fields override defaults

- ✅ Unlimited nesting renders correctly

## **6. Next Steps**

- Implement content reassignment workflow for category deletion.

- Add admin UI for reviewing unpublished categories.

- Add recursive fetch logic for unlimited nesting in both systems.
