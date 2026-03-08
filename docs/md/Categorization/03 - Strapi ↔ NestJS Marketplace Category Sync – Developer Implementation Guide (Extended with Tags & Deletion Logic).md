# **03 - Strapi ↔ NestJS Marketplace Category Sync -- Developer Implementation Guide (Extended with Tags & Deletion Logic)**

## **1. Overview**

This version extends the integration with:

- Full **Tag** entity and service code.

- **Content reassignment logic** for category deletion.

- Sync handling for tags in both directions.

- Unlimited nesting preserved.

- Hybrid SEO still in place.

## **2. Tag Entity and Service**

### **a. NestJS Tag Entity**

/apps/marketeq-nestjs/src/tags/tag.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, ManyToOne,
CreateDateColumn, UpdateDateColumn } from \'typeorm\';

import { Category } from \'../categories/category.entity\';

\@Entity(\'tags\')

export class Tag {

\@PrimaryGeneratedColumn()

id: number;

\@Column({ unique: true })

uuid: string;

\@Column()

name: string;

\@Column({ unique: true })

slug: string;

\@ManyToOne(() =\> Category, category =\> category.tags)

category: Category;

\@CreateDateColumn()

created_at: Date;

\@UpdateDateColumn()

updated_at: Date;

}



### **b. Tag Service**

/apps/marketeq-nestjs/src/tags/tag.service.ts

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { Tag } from \'./tag.entity\';

\@Injectable()

export class TagService {

constructor(

\@InjectRepository(Tag)

private readonly tagRepo: Repository\<Tag\>

) {}

async upsertTag(tagData) {

let tag = await this.tagRepo.findOne({ where: { uuid: tagData.uuid } });

if (!tag) {

tag = this.tagRepo.create();

tag.uuid = tagData.uuid;

}

Object.assign(tag, tagData);

return this.tagRepo.save(tag);

}

}



### **c. Sync Tags in Category Service**

Update CategoryService:

if (dto.tags && dto.tags.length \> 0) {

for (const tagUuid of dto.tags) {

// Ensure tags exist or create placeholders

await this.tagService.upsertTag({ uuid: tagUuid });

}

}



## **3. Content Reassignment Logic for Deletion**

### **a. NestJS Service for Safe Deletion**

/apps/marketeq-nestjs/src/categories/category.service.ts

async deleteCategory(uuid: string, reassignToUuid?: string) {

const category = await this.categoryRepo.findOne({ where: { uuid } });

if (!category) return;

// Fetch all content linked to this category

const content = await this.contentService.findByCategory(uuid);

if (reassignToUuid) {

// Reassign to selected category

await this.contentService.reassignCategory(uuid, reassignToUuid);

} else if (category.parent_id) {

// Roll up to parent if no reassignment specified

await this.contentService.reassignCategory(uuid, category.parent_id);

} else {

throw new Error(\'Cannot delete root category without reassignment.\');

}

await this.categoryRepo.remove(category);

// Notify Strapi to delete or mark inactive

await axios.delete(\`\${process.env.STRAPI_URL}/categories/\${uuid}\`, {

headers: { Authorization: \`Bearer \${process.env.STRAPI_TOKEN}\` }

});

}



### **b. Content Service Placeholder**

/apps/marketeq-nestjs/src/content/content.service.ts

@Injectable()

export class ContentService {

async findByCategory(categoryUuid: string) {

// Query all projects, services, jobs, etc. linked to categoryUuid

}

async reassignCategory(oldUuid: string, newUuid: string) {

// Update categoryUuid in all linked content

}

}



## **4. Strapi Tag Setup**

- Create Tag content-type with:

  - uuid

  - name

  - slug

  - Relation to Category

- Include tags in the same webhook payload for categories.

## **5. Step-by-Step Setup Additions**

1.  Add Tag entity and service to NestJS.

2.  Create Tag content-type in Strapi.

3.  Update Strapi webhooks to include tags.

4.  Implement safe category deletion with reassignment.

5.  Test deletion flow to ensure no content is orphaned.

## **6. Testing Checklist (Extended)**

- ✅ Tag creation in Strapi syncs to NestJS.

- ✅ Tags linked to categories sync both ways.

- ✅ Category deletion triggers reassignment flow.

- ✅ Unlimited nesting works with tags attached at any level.

- ✅ Cron sync preserves tags and categories together.

- ✅ Hybrid SEO still functions after tag updates.
