## **Portfolio Service -- Backend (NestJS + Postgres)**

### **1. Install Dependencies**

****cd apps/portfolio-service

npm i \@nestjs/common \@nestjs/core \@nestjs/platform-express
reflect-metadata rxjs

npm i typeorm \@nestjs/typeorm pg class-validator class-transformer

npm i helmet cors zod uuid dompurify jsdom

npm i -D typescript ts-node ts-node-dev \@types/node

### **2. Entities**

**File:** src/orm/entities/portfolio-item.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
UpdateDateColumn, Index } from \"typeorm\";

\@Entity(\"portfolio_item\")

export class PortfolioItem {

\@PrimaryGeneratedColumn(\"uuid\") id!: string;

\@Index()

\@Column(\"uuid\") ownerUserId!: string;

\@Index({ unique: true })

\@Column(\"text\") slug!: string;

\@Column(\"text\") title!: string;

\@Column(\"jsonb\", { nullable: true }) schemaJson!: Record\<string,
any\> \| null;

\@Column(\"text\", { nullable: true }) htmlPreview!: string \| null;

\@Column(\"text\", { nullable: true }) htmlPublished!: string \| null;

\@Column({ type: \"text\", default: \"draft\" }) status!: \"draft\" \|
\"published\" \| \"archived\";

\@CreateDateColumn() createdAt!: Date;

\@UpdateDateColumn() updatedAt!: Date;

}

### **3. Sanitizer**

**File:** src/util/sanitize.ts

import createDOMPurify from \"dompurify\";

import { JSDOM } from \"jsdom\";

const window = new JSDOM(\"\").window as unknown as Window;

const DOMPurify = createDOMPurify(window);

export function sanitizeHtml(input: string) {

return DOMPurify.sanitize(input);

}

### **4. Service**

**File:** src/services/portfolio.service.ts

import { Injectable } from \"@nestjs/common\";

import { InjectRepository } from \"@nestjs/typeorm\";

import { Repository } from \"typeorm\";

import { PortfolioItem } from \"../orm/entities/portfolio-item.entity\";

import { sanitizeHtml } from \"../util/sanitize\";

\@Injectable()

export class PortfolioService {

constructor(

\@InjectRepository(PortfolioItem) private items:
Repository\<PortfolioItem\>

) {}

async upsertDraft(input: any) {

let item = await this.items.findOne({ where: { slug: input.slug } });

const safeHtml = sanitizeHtml(input.htmlDraft);

if (!item) {

item = this.items.create({ \...input, htmlPreview: safeHtml, status:
\"draft\" });

} else {

Object.assign(item, { \...input, htmlPreview: safeHtml });

}

return this.items.save(item);

}

async publish(slug: string) {

const item = await this.items.findOneOrFail({ where: { slug } });

item.htmlPublished = item.htmlPreview;

item.status = \"published\";

return this.items.save(item);

}

async listByOwner(ownerUserId: string) {

return this.items.find({ where: { ownerUserId }, order: { updatedAt:
\"DESC\" } });

}

async getPublicBySlug(slug: string) {

return this.items.findOne({ where: { slug, status: \"published\" } });

}

async getPreviewBySlug(slug: string) {

return this.items.findOne({ where: { slug } });

}

}

### **5. Controller**

**File:** src/rest/portfolio.controller.ts

import { Body, Controller, Get, Param, Post, Query } from
\"@nestjs/common\";

import { PortfolioService } from \"../services/portfolio.service\";

\@Controller(\"portfolio\")

export class PortfolioController {

constructor(private svc: PortfolioService) {}

\@Post(\"draft\")

upsertDraft(@Body() body: any) { return this.svc.upsertDraft(body); }

\@Post(\"publish\")

publish(@Body(\"slug\") slug: string) { return this.svc.publish(slug); }

\@Get(\"list\")

list(@Query(\"owner\") owner: string) { return
this.svc.listByOwner(owner); }

\@Get(\"public/:slug\")

getPublic(@Param(\"slug\") slug: string) { return
this.svc.getPublicBySlug(slug); }

\@Get(\"preview/:slug\")

getPreview(@Param(\"slug\") slug: string) { return
this.svc.getPreviewBySlug(slug); }

}

### **6. Dockerfile**

**File:** Dockerfile

FROM node:20-alpine

WORKDIR /app

COPY package\*.json ./

RUN npm ci \--omit=dev

COPY . .

RUN npm run build

EXPOSE 3000

CMD \[\"node\",\"dist/main.js\"\]



## **Next Steps**

1.  **Backend Dev**: Set up apps/portfolio-service, add entities,
    service, controller, run migrations, deploy to Render.

2.  **Frontend Dev**: Add EditorModal.tsx and PortfolioRenderer.tsx,
    wire autosave/publish calls to the backend, style blocks with
    Tailwind per design.

3.  QA both editor mode and client view on desktop/tablet/mobile.
