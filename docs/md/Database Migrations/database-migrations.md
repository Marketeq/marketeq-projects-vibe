# Database Migrations

## Why Migrations Instead of Synchronize

TypeORM's `synchronize: true` automatically alters database tables to match your entity definitions every time the application starts. While convenient during early development, it is dangerous for production and even staging environments:

- **Data loss**: `synchronize` can drop columns, rename tables, or alter types in ways that destroy data.
- **No rollback**: There is no way to undo what `synchronize` did. If it breaks something, you must restore from a backup.
- **Non-deterministic**: The exact SQL that runs depends on the diff between your entities and the current DB state, which can vary across environments.
- **No audit trail**: You have no record of what changed or when.

Migrations solve all of these problems. Each migration is a versioned, reviewable TypeScript file containing explicit `up()` and `down()` SQL. They run once, in order, and TypeORM tracks which have been applied in a `migrations` table.

**Rule: `synchronize` is set to `false` in every service. Do not change this.**

## Project Structure

Each microservice owns its own migrations inside its app directory:

```
backend/apps/<service>/src/
  migrations/
    1710000000000-InitSchema.ts    # baseline (no-op for existing tables)
    1710000001000-AddEmailIndex.ts # example incremental migration
  data-source.ts                   # TypeORM DataSource for CLI usage
  <service>.module.ts              # NestJS module (migrationsRun: true)
```

The `data-source.ts` file is used by the TypeORM CLI to connect to the database and discover entities/migrations. The module file configures TypeORM for the running NestJS application with `migrationsRun: true`, which auto-runs pending migrations on startup.

## How to Create a New Migration

### Step 1: Modify your entity

Edit the entity file(s) in the service. For example, add a new column:

```typescript
@Column({ type: 'varchar', length: 255, nullable: true })
avatarUrl: string;
```

### Step 2: Generate the migration

From the **backend/** directory, run:

```bash
# From repo root:
./scripts/devops/migrate.sh <service-name> generate <MigrationName>

# Example:
./scripts/devops/migrate.sh user-service generate AddAvatarUrl
```

This compares your entities against the current database schema and generates a migration file with the necessary `ALTER TABLE` statements.

### Step 3: Review the generated migration

Open the generated file in `apps/<service>/src/migrations/` and verify:

- The `up()` method contains the correct SQL.
- The `down()` method properly reverts the changes.
- No unintended changes are included (TypeORM sometimes generates spurious diffs).

### Step 4: Test the migration

```bash
# Run the migration against your local database:
./scripts/devops/migrate.sh <service-name> run

# Verify it applied correctly:
./scripts/devops/migrate.sh <service-name> show
```

### Step 5: Commit

Commit the migration file along with the entity changes. The migration will run automatically when the service starts in any environment (due to `migrationsRun: true`).

## How to Run Migrations

```bash
# Run pending migrations for a single service:
./scripts/devops/migrate.sh user-service run

# Run pending migrations for ALL services:
./scripts/devops/migrate.sh all run

# Show migration status for a service:
./scripts/devops/migrate.sh user-service show

# Show migration status for all services:
./scripts/devops/migrate.sh all show
```

Migrations also run automatically on service startup because every service has `migrationsRun: true` in its TypeORM configuration.

## How to Revert Migrations

```bash
# Revert the last migration for a service:
./scripts/devops/migrate.sh user-service revert

# Revert for all services (reverts one migration per service):
./scripts/devops/migrate.sh all revert
```

To revert multiple migrations, run the revert command multiple times.

## The migrate.sh Script

Location: `scripts/devops/migrate.sh`

```
Usage: ./scripts/devops/migrate.sh <service|all> <run|generate|revert|show> [migration-name]

Commands:
  run       Run all pending migrations
  generate  Generate a new migration (requires migration-name, single service only)
  revert    Revert the last executed migration
  show      Show all migrations and their status
```

The script uses each service's `data-source.ts` file to connect to the correct database with the correct schema. It wraps the TypeORM CLI with `ts-node` so you can work directly with `.ts` migration files.

## Team Rules

1. **Never set `synchronize: true`** in any service module, data source, or environment. This is the single most important rule.

2. **Always create a migration** when you change an entity. Even small changes (adding a column, changing a type, adding an index) require a migration.

3. **Never edit a migration that has already been applied** to any shared environment (staging, production). If you need to fix something, create a new migration.

4. **Test migrations locally before pushing.** Run `migrate.sh <service> run` and `migrate.sh <service> revert` to verify both directions work.

5. **Review generated migrations.** TypeORM's migration generator is imperfect. It may generate unnecessary changes or miss edge cases. Always read the generated SQL.

6. **Name migrations descriptively.** Use PascalCase names that describe the change: `AddAvatarUrlToUser`, `CreateInvoiceTable`, `DropLegacyColumns`.

7. **Keep migrations small.** One migration per logical change. Do not bundle unrelated schema changes into a single migration.

8. **The `down()` method must work.** Every migration must be fully reversible. If a migration drops data (e.g., dropping a column), the `down()` should recreate it with a sensible default.

9. **Coordinate across services.** If a schema change in one service affects inter-service contracts (e.g., a field that other services read via RabbitMQ events), communicate the change and coordinate deployment order.

## Initial Schema Migrations

Services that were created with `synchronize: true` have a baseline migration called `1710000000000-InitSchema.ts`. This migration has empty `up()` and `down()` methods because the tables already existed in the database. It serves as a starting point so that future incremental migrations can be tracked correctly.

If you are setting up a brand new database from scratch, you will need to either:
- Run the service once with `synchronize: true` to create the initial tables, then switch back to `false`, OR
- Write a proper `InitSchema` migration that creates all tables from scratch.
