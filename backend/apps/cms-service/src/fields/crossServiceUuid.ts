import { randomUUID } from 'crypto';
import type { Field } from 'payload/types';

/**
 * Stable UUID for cross-service identity. Downstream services (category-service,
 * listings-service, etc.) upsert on this value — if it mutates, every consumer
 * stops matching rows. Enforces:
 *   - required + unique + indexed at the schema level
 *   - readOnly in the admin panel (visible, not editable)
 *   - auto-generated on create when missing or blank
 *   - user-provided values accepted on create (required for inbound sync — e.g.
 *     category-service pushes its own local UUID so the two sides stay keyed
 *     to the same identifier)
 *   - immutable on update — the previous doc's value always wins, even if the
 *     REST API tries to set a new one
 */
export function crossServiceUuidField(): Field {
  return {
    name: 'uuid',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    admin: {
      readOnly: true,
      description: 'Stable UUID for cross-service identity. Auto-generated on create, immutable afterwards.',
      // Hidden on the create view — the hook supplies it on save, so there's
      // nothing for a human to do here. Shown as a disabled input on edit so
      // admins can still read / copy the value.
      condition: (data) => Boolean((data as { id?: unknown } | undefined)?.id),
      hidden: true,
    },
    hooks: {
      beforeValidate: [
        ({ value, operation, originalDoc }) => {
          if (operation === 'create') {
            const trimmed = typeof value === 'string' ? value.trim() : '';
            return trimmed || randomUUID();
          }
          const existing = (originalDoc as { uuid?: string } | undefined)?.uuid;
          return existing ?? value;
        },
      ],
    },
  };
}
