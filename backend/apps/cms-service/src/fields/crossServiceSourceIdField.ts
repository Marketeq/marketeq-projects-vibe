import type { Field } from 'payload/types';

interface Options {
  /** Field-level required flag (defaults to false). */
  required?: boolean;
  /** Field-level unique flag (defaults to true — usually set per row by upstream). */
  unique?: boolean;
  /** Human-facing description of which upstream service owns this id. */
  description: string;
}

/**
 * Stable identifier minted by an UPSTREAM service (listings-service,
 * user-service, contracts-service, etc.) and stored in CMS so the two
 * sides can upsert against each other. The inverse of crossServiceUuidField:
 * uuid is what CMS owns and broadcasts; sourceId is what CMS receives.
 *
 * Mutating an existing sourceId silently breaks the link to the upstream
 * row — the upstream service's next sync no longer matches and creates a
 * duplicate. Per CS-06 cross-service-identity rules this field is
 * append-once: settable on create, settable as a one-time backfill if
 * still null, otherwise immutable.
 *
 * The admin UI keeps the input editable so a human can paste in a value
 * the first time. The beforeValidate hook silently preserves the original
 * once it's set — admin edits are no-ops, mirroring the crossServiceUuidField
 * behaviour. The description warns of this.
 */
export function crossServiceSourceIdField(options: Options): Field {
  return {
    name: 'sourceId',
    type: 'text',
    required: options.required ?? false,
    unique: options.unique ?? true,
    index: true,
    admin: {
      // Readonly in the admin UI so admins can SEE the upstream identifier
      // but can't accidentally rewrite it. The value flows in via REST from
      // the upstream service (listings-service, user-service, etc.) using
      // the shared API-Key. The beforeValidate hook is the second line of
      // defence — even if a caller bypasses the UI and PATCHes via API,
      // the value can only ever transition from null → set, never set → set.
      readOnly: true,
      description: `${options.description} Set on create by upstream sync; immutable once set.`,
      // Hidden on the create view — the field is system-managed (the
      // upstream service POSTs the value via REST + API-Key), so there's
      // nothing for a human to type and a required-asterisk on a disabled
      // empty input is just confusing UX. Shown as a disabled input on
      // edit so admins can read / copy / debug the value.
      condition: (data) => Boolean((data as { id?: unknown } | undefined)?.id),
    },
    hooks: {
      beforeValidate: [
        ({ value, operation, originalDoc }) => {
          if (operation !== 'update') return value;
          const existing = (originalDoc as { sourceId?: string | null } | undefined)?.sourceId;
          // First-time backfill: empty → some value is allowed (the
          // upstream sync may set this on a row created earlier without it).
          if (existing == null || existing === '') return value;
          // Once non-empty, lock the value. Caller-provided value is dropped.
          return existing;
        },
      ],
    },
  };
}
