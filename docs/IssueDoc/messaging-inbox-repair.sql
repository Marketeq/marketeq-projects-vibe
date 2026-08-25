-- ============================================================================
-- messaging-service inbox threads — schema diagnostic + repair
--
-- Symptom : GET /v1/threads (inbox thread list) 500s in prod.
-- Cause   : columns dropped from the `messaging` schema by a rogue TypeORM
--           synchronize:true process. See ROOT CAUSE note at the bottom.
--
-- ORDER OF OPERATIONS — do not skip:
--   1. Block the rogue writer FIRST (firewall 12.181.101.148 off :5433).
--      Running this script before the block is pointless; the columns get
--      re-dropped within seconds.
--   2. Run SECTION 1 (read-only) and read the output.
--   3. Run SECTION 2 (repair). It is idempotent and safe to re-run.
--   4. Run SECTION 3 to verify.
--
-- Expected columns below are derived from the entity definitions at
-- backend/apps/messaging-service/src/**/entities/*.entity.ts
-- ============================================================================


-- ============================================================================
-- SECTION 1 — DIAGNOSTIC (read-only, safe to run any time)
-- Lists every column the inbox code path requires that is MISSING from the DB.
-- ============================================================================

WITH expected(table_name, column_name) AS (VALUES
    -- threads (Thread entity)
    ('threads',            'id'),
    ('threads',            'participantIds'),
    ('threads',            'isGroup'),
    ('threads',            'groupName'),
    ('threads',            'projectId'),        -- referenced unconditionally by getUserThreads()
    ('threads',            'createdAt'),
    ('threads',            'updatedAt'),
    -- messages (Message entity)
    ('messages',           'id'),
    ('messages',           'threadId'),
    ('messages',           'senderId'),
    ('messages',           'content'),
    ('messages',           'ciphertext'),
    ('messages',           'replyToMessageId'),
    ('messages',           'forwardedFromId'),
    ('messages',           'quotedCiphertext'),
    ('messages',           'status'),
    ('messages',           'messageType'),
    ('messages',           'edited'),
    ('messages',           'pinned'),
    ('messages',           'starred'),
    ('messages',           'deleted'),
    ('messages',           'reactions'),
    ('messages',           'createdAt'),
    ('messages',           'updatedAt'),
    -- thread_user_state (ThreadUserState entity)
    ('thread_user_state',  'id'),
    ('thread_user_state',  'threadId'),
    ('thread_user_state',  'userId'),
    ('thread_user_state',  'isPinned'),
    ('thread_user_state',  'isStarred'),
    ('thread_user_state',  'isArchived'),
    ('thread_user_state',  'isSpam'),
    ('thread_user_state',  'isMuted'),
    ('thread_user_state',  'isTrashed'),
    ('thread_user_state',  'markedUnread'),
    ('thread_user_state',  'lastReadAt'),
    ('thread_user_state',  'createdAt'),
    ('thread_user_state',  'updatedAt'),
    -- attachments (Attachment entity)
    ('attachments',        'id'),
    ('attachments',        'messageId'),
    ('attachments',        'fileUrl'),
    ('attachments',        'fileType'),
    ('attachments',        'fileSize'),
    ('attachments',        'fileName'),
    ('attachments',        'createdAt')
)
SELECT e.table_name,
       e.column_name,
       CASE
         WHEN c.column_name IS NULL THEN '*** MISSING ***'
         ELSE 'ok'
       END AS status
FROM expected e
LEFT JOIN information_schema.columns c
       ON c.table_schema = 'messaging'
      AND c.table_name   = e.table_name
      AND c.column_name  = e.column_name
ORDER BY (c.column_name IS NULL) DESC, e.table_name, e.column_name;


-- ============================================================================
-- SECTION 2 — REPAIR (idempotent; re-running is a no-op)
--
-- READ THIS BEFORE RUNNING:
-- These statements restore the SCHEMA, not the DATA. Any data that lived in a
-- dropped column is permanently gone — DROP COLUMN is not recoverable without a
-- backup. For flags/defaults (deleted, pinned, reactions...) that is harmless.
-- For `messages.content` / `messages.ciphertext` it means message BODIES are
-- lost for the affected rows. If either of those shows MISSING in Section 1,
-- STOP and restore from backup instead of running this section.
-- ============================================================================

-- Enum types must exist before the columns that use them.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t
                   JOIN pg_namespace n ON n.oid = t.typnamespace
                   WHERE t.typname = 'messages_status_enum' AND n.nspname = 'messaging') THEN
        CREATE TYPE "messaging"."messages_status_enum" AS ENUM ('sent', 'delivered', 'read');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t
                   JOIN pg_namespace n ON n.oid = t.typnamespace
                   WHERE t.typname = 'messages_messagetype_enum' AND n.nspname = 'messaging') THEN
        CREATE TYPE "messaging"."messages_messagetype_enum" AS ENUM ('text', 'file', 'gif');
    END IF;
END $$;

-- threads
ALTER TABLE "messaging"."threads"
    ADD COLUMN IF NOT EXISTS "projectId"      uuid,
    ADD COLUMN IF NOT EXISTS "isGroup"        boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "groupName"      character varying,
    ADD COLUMN IF NOT EXISTS "createdAt"      timestamp NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS "updatedAt"      timestamp NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS "IDX_threads_projectId"
    ON "messaging"."threads" ("projectId");

-- messages
ALTER TABLE "messaging"."messages"
    ADD COLUMN IF NOT EXISTS "content"            text,
    ADD COLUMN IF NOT EXISTS "ciphertext"         text,
    ADD COLUMN IF NOT EXISTS "replyToMessageId"   character varying,
    ADD COLUMN IF NOT EXISTS "forwardedFromId"    character varying,
    ADD COLUMN IF NOT EXISTS "quotedCiphertext"   text,
    ADD COLUMN IF NOT EXISTS "status"             "messaging"."messages_status_enum" NOT NULL DEFAULT 'sent',
    ADD COLUMN IF NOT EXISTS "messageType"        "messaging"."messages_messagetype_enum" NOT NULL DEFAULT 'text',
    ADD COLUMN IF NOT EXISTS "edited"             boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "pinned"             boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "starred"            boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "deleted"            boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "reactions"          jsonb   NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS "createdAt"          timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS "updatedAt"          timestamp   NOT NULL DEFAULT now();

-- thread_user_state
ALTER TABLE "messaging"."thread_user_state"
    ADD COLUMN IF NOT EXISTS "isPinned"      boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isStarred"     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isArchived"    boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isSpam"        boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isMuted"       boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isTrashed"     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "markedUnread"  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "lastReadAt"    timestamptz,
    ADD COLUMN IF NOT EXISTS "createdAt"     timestamp   NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS "updatedAt"     timestamptz NOT NULL DEFAULT now();

-- attachments
ALTER TABLE "messaging"."attachments"
    ADD COLUMN IF NOT EXISTS "fileUrl"    character varying,
    ADD COLUMN IF NOT EXISTS "fileType"   character varying,
    ADD COLUMN IF NOT EXISTS "fileSize"   integer,
    ADD COLUMN IF NOT EXISTS "fileName"   character varying,
    ADD COLUMN IF NOT EXISTS "createdAt"  timestamp NOT NULL DEFAULT now();


-- ============================================================================
-- SECTION 3 — VERIFY
-- Re-run SECTION 1: every row should read 'ok'.
-- Then run the query below — it is the exact shape getUserThreads() issues.
-- It must return without error (an empty result is fine).
-- Replace :uid with any real user id.
-- ============================================================================

-- \set uid '00000000-0000-0000-0000-000000000000'

SELECT t."id", t."participantIds", t."projectId", t."updatedAt"
FROM "messaging"."threads" t
WHERE :'uid' = ANY (t."participantIds")
  AND t."projectId" IS NULL
ORDER BY t."updatedAt" DESC
LIMIT 5;


-- ============================================================================
-- ROOT CAUSE — why this happened, and why a redeploy will NOT fix it
--
-- 1. messaging-service itself is NOT the culprit. Both its runtime config
--    (messaging-service.module.ts:34) and its CLI datasource (data-source.ts:19)
--    correctly set synchronize:false.
--
-- 2. Seven other services enable synchronize whenever NODE_ENV is not exactly
--    'production' — the default state of any developer's laptop:
--      auth-service/auth-service.module.ts:23 and :44
--      autocomplete-service/autocomplete-service.module.ts:37
--      content-moderation-service/content-moderation-service.module.ts:20
--      checkout-service/checkout-service.module.ts:33
--      favorites-service/favorites-service.module.ts:20
--      notification-service/notification-service.module.ts:47
--      contracts-service/contracts-service.module.ts:28
--    Point any of those at the prod DATABASE_URL with NODE_ENV unset and TypeORM
--    will DROP every column its entities do not know about. auth-service owning
--    the `users` table is why the July password-reset column vanished.
--
-- 3. Why restarting messaging-service does NOT restore projectId:
--    messaging-service.module.ts sets migrationsRun:true, so migrations run on
--    every boot — but TypeORM records applied migrations in the `migrations`
--    table and SKIPS anything already recorded. 1793500000000-AddProjectIdToThreads
--    is already recorded, so its up() never runs again. The column stays missing
--    until it is restored manually. Hence this script.
-- ============================================================================
