# **Database Schema & Migrations** 

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service/src\
**DB:** PostgreSQL 15+\
**ORM:** TypeORM (adjust paths if your repo uses Prisma)

> This version removes: **audit_log**, **Idempotency** notes, **progress
> snapshot columns**, and **seed scripts** to align strictly with the
> standards.

## **1) Entity/Table Overview**

  -----------------------------------------------------------------------
  user_profile (1:1 with user) \-- key only; no progress snapshot
  columns\
  about_me (1:1) \-- sanitized HTML\
  user_skill (N) \-- case-insensitive unique per user; cap 100 (enforced
  in app)\
  experience (N) \-- employer/title/dates; sanitized HTML desc\
  education (N) \-- institution/degree/dates; similar to experience\
  rate_title (\<=3) \-- title + currency/amount; case-insensitive unique
  per user (cap 3 enforced in app)\
  portfolio_item (N) \-- title/desc + normalized URL
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> Notes

- **Caps** (skills ≤ 100; titles ≤ 3) are enforced in **application
  code**; DB ensures uniqueness and basic constraints.

- **Sanitized HTML** is performed server-side prior to persist; DB
  stores as text.

## **2) SQL DDL (authoritative)**

  -----------------------------------------------------------------------
  \-- 01_user_profile.sql\
  CREATE TABLE IF NOT EXISTS user_profile (\
  user_id UUID PRIMARY KEY,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\
  );\
  \
  CREATE OR REPLACE FUNCTION set_updated_at()\
  RETURNS TRIGGER AS \$\$\
  BEGIN\
  NEW.updated_at = NOW();\
  RETURN NEW;\
  END; \$\$ LANGUAGE plpgsql;\
  \
  CREATE TRIGGER trg_user_profile_updated\
  BEFORE UPDATE ON user_profile\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  \-- 02_about_me.sql\
  CREATE TABLE IF NOT EXISTS about_me (\
  user_id UUID PRIMARY KEY REFERENCES user_profile(user_id) ON DELETE
  CASCADE,\
  content_html TEXT NOT NULL, \-- already sanitized by backend\
  CONSTRAINT about_me_content_len CHECK (char_length(content_html) \<=
  2600),\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\
  );\
  \
  CREATE TRIGGER trg_about_me_updated\
  BEFORE UPDATE ON about_me\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  \-- 03_user_skill.sql\
  CREATE TABLE IF NOT EXISTS user_skill (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE
  CASCADE,\
  value_raw VARCHAR(160) NOT NULL, \-- as entered (after trim/collapse)\
  value_norm VARCHAR(160) NOT NULL, \-- normalized (lowercase)\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\
  );\
  \
  \-- Case-insensitive uniqueness per user (application ensures ≤100
  total)\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_user_skill_user_norm\
  ON user_skill (user_id, value_norm);\
  \
  CREATE INDEX IF NOT EXISTS ix_user_skill_user_created\
  ON user_skill (user_id, created_at DESC);
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  \-- 04_experience.sql\
  CREATE TABLE IF NOT EXISTS experience (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE
  CASCADE,\
  employer VARCHAR(200) NOT NULL,\
  title VARCHAR(200) NOT NULL,\
  start_date DATE NOT NULL,\
  end_date DATE NULL, \-- NULL when \"currently here\"\
  description_html TEXT NULL, \-- sanitized\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  \
  ALTER TABLE experience\
  ADD CONSTRAINT experience_date_ok\
  CHECK (end_date IS NULL OR end_date \>= start_date);\
  \
  CREATE INDEX IF NOT EXISTS ix_experience_user_created\
  ON experience (user_id, created_at DESC);\
  \
  CREATE INDEX IF NOT EXISTS ix_experience_user_deleted\
  ON experience (user_id, deleted_at);\
  \
  CREATE TRIGGER trg_experience_updated\
  BEFORE UPDATE ON experience\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  \-- 05_education.sql\
  CREATE TABLE IF NOT EXISTS education (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE
  CASCADE,\
  institution VARCHAR(200) NOT NULL,\
  degree VARCHAR(200) NOT NULL,\
  start_date DATE NOT NULL,\
  end_date DATE NULL, \-- NULL when \"currently attending\"\
  description_html TEXT NULL, \-- sanitized (if used)\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  \
  ALTER TABLE education\
  ADD CONSTRAINT education_date_ok\
  CHECK (end_date IS NULL OR end_date \>= start_date);\
  \
  CREATE INDEX IF NOT EXISTS ix_education_user_created\
  ON education (user_id, created_at DESC);\
  \
  CREATE INDEX IF NOT EXISTS ix_education_user_deleted\
  ON education (user_id, deleted_at);\
  \
  CREATE TRIGGER trg_education_updated\
  BEFORE UPDATE ON education\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  \-- 06_rate_title.sql\
  CREATE TABLE IF NOT EXISTS rate_title (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE
  CASCADE,\
  title_raw VARCHAR(160) NOT NULL,\
  title_norm VARCHAR(160) NOT NULL, \-- normalized lowercase\
  currency VARCHAR(3) NOT NULL, \-- ISO 4217, e.g. \'USD\'\
  amount NUMERIC(12,2) NOT NULL CHECK (amount \> 0),\
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  \
  \-- Unique title per user (case-insensitive), excluding soft-deleted
  rows\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_rate_title_user_norm\
  ON rate_title (user_id, title_norm)\
  WHERE deleted_at IS NULL;\
  \
  \-- Ensure only one primary at a time (soft-deletes excluded)\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_rate_title_user_primary\
  ON rate_title (user_id)\
  WHERE is_primary = TRUE AND deleted_at IS NULL;\
  \
  CREATE INDEX IF NOT EXISTS ix_rate_title_user_created\
  ON rate_title (user_id, created_at DESC);\
  \
  CREATE TRIGGER trg_rate_title_updated\
  BEFORE UPDATE ON rate_title\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  \-- 07_portfolio_item.sql\
  CREATE TABLE IF NOT EXISTS portfolio_item (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE
  CASCADE,\
  title VARCHAR(200) NOT NULL,\
  description VARCHAR(2000) NULL,\
  url_raw VARCHAR(2048) NOT NULL,\
  url_normalized VARCHAR(2048) NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  \
  \-- Avoid duplicates by normalized URL per user (excluding
  soft-deleted)\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_portfolio_user_url\
  ON portfolio_item (user_id, url_normalized)\
  WHERE deleted_at IS NULL;\
  \
  CREATE INDEX IF NOT EXISTS ix_portfolio_user_created\
  ON portfolio_item (user_id, created_at DESC);\
  \
  CREATE TRIGGER trg_portfolio_updated\
  BEFORE UPDATE ON portfolio_item\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **3) TypeORM Entity Stubs (reference)**

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/user-profile.entity.ts\
  import { Column, Entity, PrimaryColumn, UpdateDateColumn,
  CreateDateColumn } from \'typeorm\';\
  \
  \@Entity({ name: \'user_profile\' })\
  export class UserProfileEntity {\
  \@PrimaryColumn(\'uuid\')\
  user_id!: string;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/about-me.entity.ts\
  import { Column, Entity, PrimaryColumn, UpdateDateColumn,
  CreateDateColumn } from \'typeorm\';\
  \
  \@Entity({ name: \'about_me\' })\
  export class AboutMeEntity {\
  \@PrimaryColumn(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'text\' })\
  content_html!: string;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/user-skill.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ux_user_skill_user_norm\', \[\'user_id\', \'value_norm\'\], {
  unique: true })\
  \@Entity({ name: \'user_skill\' })\
  export class UserSkillEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  value_raw!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  value_norm!: string; // lowercase, trimmed\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/experience.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ix_experience_user_created\', \[\'user_id\',
  \'created_at\'\])\
  \@Entity({ name: \'experience\' })\
  export class ExperienceEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  employer!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  title!: string;\
  \
  \@Column({ type: \'date\' })\
  start_date!: string;\
  \
  \@Column({ type: \'date\', nullable: true })\
  end_date!: string \| null;\
  \
  \@Column({ type: \'text\', nullable: true })\
  description_html!: string \| null;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  \
  \@Column({ type: \'timestamptz\', nullable: true })\
  deleted_at!: Date \| null;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/education.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ix_education_user_created\', \[\'user_id\',
  \'created_at\'\])\
  \@Entity({ name: \'education\' })\
  export class EducationEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  institution!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  degree!: string;\
  \
  \@Column({ type: \'date\' })\
  start_date!: string;\
  \
  \@Column({ type: \'date\', nullable: true })\
  end_date!: string \| null;\
  \
  \@Column({ type: \'text\', nullable: true })\
  description_html!: string \| null;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  \
  \@Column({ type: \'timestamptz\', nullable: true })\
  deleted_at!: Date \| null;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/rate-title.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ux_rate_title_user_norm\', \[\'user_id\', \'title_norm\'\], {
  unique: true, where: \'deleted_at IS NULL\' })\
  \@Index(\'ux_rate_title_user_primary\', \[\'user_id\'\], { unique:
  true, where: \'is_primary = TRUE AND deleted_at IS NULL\' })\
  \@Entity({ name: \'rate_title\' })\
  export class RateTitleEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  title_raw!: string;\
  \
  \@Column({ type: \'varchar\', length: 160 })\
  title_norm!: string;\
  \
  \@Column({ type: \'varchar\', length: 3 })\
  currency!: string; // ISO 4217\
  \
  \@Column({ type: \'numeric\', precision: 12, scale: 2 })\
  amount!: string;\
  \
  \@Column({ type: \'boolean\', default: false })\
  is_primary!: boolean;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  \
  \@Column({ type: \'timestamptz\', nullable: true })\
  deleted_at!: Date \| null;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  // apps/user-service/src/database/entities/portfolio-item.entity.ts\
  import { Column, Entity, PrimaryGeneratedColumn, Index,
  UpdateDateColumn, CreateDateColumn } from \'typeorm\';\
  \
  \@Index(\'ux_portfolio_user_url\', \[\'user_id\', \'url_normalized\'\],
  { unique: true, where: \'deleted_at IS NULL\' })\
  \@Entity({ name: \'portfolio_item\' })\
  export class PortfolioItemEntity {\
  \@PrimaryGeneratedColumn(\'uuid\')\
  id!: string;\
  \
  \@Column(\'uuid\')\
  user_id!: string;\
  \
  \@Column({ type: \'varchar\', length: 200 })\
  title!: string;\
  \
  \@Column({ type: \'varchar\', length: 2000, nullable: true })\
  description!: string \| null;\
  \
  \@Column({ type: \'varchar\', length: 2048 })\
  url_raw!: string;\
  \
  \@Column({ type: \'varchar\', length: 2048 })\
  url_normalized!: string;\
  \
  \@CreateDateColumn({ type: \'timestamptz\' })\
  created_at!: Date;\
  \
  \@UpdateDateColumn({ type: \'timestamptz\' })\
  updated_at!: Date;\
  \
  \@Column({ type: \'timestamptz\', nullable: true })\
  deleted_at!: Date \| null;\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) TypeORM Migration Skeleton (single file example)**

  ---------------------------------------------------------------------------------
  //
  apps/user-service/src/database/migrations/1700000000000_profile_edit_modals.ts\
  import { MigrationInterface, QueryRunner } from \'typeorm\';\
  \
  export class ProfileEditModals1700000000000 implements MigrationInterface {\
  name = \'ProfileEditModals1700000000000\';\
  \
  public async up(queryRunner: QueryRunner): Promise\<void\> {\
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS user_profile (\
  user_id UUID PRIMARY KEY,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\
  );\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE OR REPLACE FUNCTION set_updated_at()\
  RETURNS TRIGGER AS \$\$\
  BEGIN\
  NEW.updated_at = NOW();\
  RETURN NEW;\
  END; \$\$ LANGUAGE plpgsql;\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS about_me (\
  user_id UUID PRIMARY KEY REFERENCES user_profile(user_id) ON DELETE CASCADE,\
  content_html TEXT NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  CONSTRAINT about_me_content_len CHECK (char_length(content_html) \<= 2600)\
  );\
  CREATE TRIGGER trg_about_me_updated\
  BEFORE UPDATE ON about_me\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS user_skill (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,\
  value_raw VARCHAR(160) NOT NULL,\
  value_norm VARCHAR(160) NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\
  );\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_user_skill_user_norm\
  ON user_skill (user_id, value_norm);\
  CREATE INDEX IF NOT EXISTS ix_user_skill_user_created\
  ON user_skill (user_id, created_at DESC);\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS experience (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,\
  employer VARCHAR(200) NOT NULL,\
  title VARCHAR(200) NOT NULL,\
  start_date DATE NOT NULL,\
  end_date DATE NULL,\
  description_html TEXT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL,\
  CONSTRAINT experience_date_ok CHECK (end_date IS NULL OR end_date \>=
  start_date)\
  );\
  CREATE INDEX IF NOT EXISTS ix_experience_user_created\
  ON experience (user_id, created_at DESC);\
  CREATE INDEX IF NOT EXISTS ix_experience_user_deleted\
  ON experience (user_id, deleted_at);\
  CREATE TRIGGER trg_experience_updated\
  BEFORE UPDATE ON experience\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS education (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,\
  institution VARCHAR(200) NOT NULL,\
  degree VARCHAR(200) NOT NULL,\
  start_date DATE NOT NULL,\
  end_date DATE NULL,\
  description_html TEXT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL,\
  CONSTRAINT education_date_ok CHECK (end_date IS NULL OR end_date \>= start_date)\
  );\
  CREATE INDEX IF NOT EXISTS ix_education_user_created\
  ON education (user_id, created_at DESC);\
  CREATE INDEX IF NOT EXISTS ix_education_user_deleted\
  ON education (user_id, deleted_at);\
  CREATE TRIGGER trg_education_updated\
  BEFORE UPDATE ON education\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS rate_title (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,\
  title_raw VARCHAR(160) NOT NULL,\
  title_norm VARCHAR(160) NOT NULL,\
  currency VARCHAR(3) NOT NULL,\
  amount NUMERIC(12,2) NOT NULL CHECK (amount \> 0),\
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_rate_title_user_norm\
  ON rate_title (user_id, title_norm)\
  WHERE deleted_at IS NULL;\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_rate_title_user_primary\
  ON rate_title (user_id)\
  WHERE is_primary = TRUE AND deleted_at IS NULL;\
  CREATE INDEX IF NOT EXISTS ix_rate_title_user_created\
  ON rate_title (user_id, created_at DESC);\
  CREATE TRIGGER trg_rate_title_updated\
  BEFORE UPDATE ON rate_title\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();\
  \`);\
  \
  await queryRunner.query(\`\
  CREATE TABLE IF NOT EXISTS portfolio_item (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL REFERENCES user_profile(user_id) ON DELETE CASCADE,\
  title VARCHAR(200) NOT NULL,\
  description VARCHAR(2000) NULL,\
  url_raw VARCHAR(2048) NOT NULL,\
  url_normalized VARCHAR(2048) NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE UNIQUE INDEX IF NOT EXISTS ux_portfolio_user_url\
  ON portfolio_item (user_id, url_normalized)\
  WHERE deleted_at IS NULL;\
  CREATE INDEX IF NOT EXISTS ix_portfolio_user_created\
  ON portfolio_item (user_id, created_at DESC);\
  CREATE TRIGGER trg_portfolio_updated\
  BEFORE UPDATE ON portfolio_item\
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();\
  \`);\
  }\
  \
  public async down(queryRunner: QueryRunner): Promise\<void\> {\
  await queryRunner.query(\`DROP TRIGGER IF EXISTS trg_portfolio_updated ON
  portfolio_item;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_portfolio_user_created;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ux_portfolio_user_url;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS portfolio_item;\`);\
  \
  await queryRunner.query(\`DROP TRIGGER IF EXISTS trg_rate_title_updated ON
  rate_title;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_rate_title_user_created;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ux_rate_title_user_primary;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ux_rate_title_user_norm;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS rate_title;\`);\
  \
  await queryRunner.query(\`DROP TRIGGER IF EXISTS trg_education_updated ON
  education;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_education_user_deleted;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_education_user_created;\`);\
  await queryRunner.query(\`ALTER TABLE IF EXISTS education DROP CONSTRAINT IF
  EXISTS education_date_ok;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS education;\`);\
  \
  await queryRunner.query(\`DROP TRIGGER IF EXISTS trg_experience_updated ON
  experience;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_experience_user_deleted;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_experience_user_created;\`);\
  await queryRunner.query(\`ALTER TABLE IF EXISTS experience DROP CONSTRAINT IF
  EXISTS experience_date_ok;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS experience;\`);\
  \
  await queryRunner.query(\`DROP INDEX IF EXISTS ix_user_skill_user_created;\`);\
  await queryRunner.query(\`DROP INDEX IF EXISTS ux_user_skill_user_norm;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS user_skill;\`);\
  \
  await queryRunner.query(\`DROP TRIGGER IF EXISTS trg_about_me_updated ON
  about_me;\`);\
  await queryRunner.query(\`ALTER TABLE IF EXISTS about_me DROP CONSTRAINT IF
  EXISTS about_me_content_len;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS about_me;\`);\
  \
  await queryRunner.query(\`DROP TRIGGER IF EXISTS trg_user_profile_updated ON
  user_profile;\`);\
  await queryRunner.query(\`DROP FUNCTION IF EXISTS set_updated_at;\`);\
  await queryRunner.query(\`DROP TABLE IF EXISTS user_profile;\`);\
  }\
  }
  ---------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------

## **5) Verification Checklist**

\[ \] Migration up succeeds on fresh DB

\[ \] Unique indexes prevent duplicate skills/titles per user
(case-insensitive)

\[ \] CHECK constraints for amount (\>0) and date ranges hold

\[ \] Soft-delete indexes exist for list queries

\[ \] Triggers update updated_at columns
