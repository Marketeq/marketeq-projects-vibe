import React from 'react';
import { useField } from 'payload/components/forms';
import { useDocumentInfo } from 'payload/components/utilities';

const GenerateDeliverablesFromListingsButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const { value: deliverablesValue, setValue: setDeliverables } = useField<unknown>({
    path: 'deliverables',
  });

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasDeliverables =
    Array.isArray(deliverablesValue) && deliverablesValue.length > 0;

  return React.createElement(
    'div',
    { style: { marginBottom: '0.75rem' } },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'btn btn--style-secondary btn--size-small',
        disabled: busy || !id,
        onClick: async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch(
              `/api/projects/${encodeURIComponent(String(id))}/generate-deliverables`,
              {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'content-type': 'application/json' },
              },
            );
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `HTTP ${res.status}`);
            }
            const json = (await res.json()) as { deliverables?: unknown };
            setDeliverables(Array.isArray(json.deliverables) ? json.deliverables : []);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'Failed to generate deliverables',
            );
          } finally {
            setBusy(false);
          }
        },
      },
      busy
        ? 'Generating…'
        : hasDeliverables
          ? 'Regenerate Deliverables'
          : 'Generate Deliverables',
    ),
    React.createElement(
      'div',
      {
        style: {
          marginTop: '0.35rem',
          fontSize: '0.8rem',
          color: 'var(--theme-elevation-500)',
        },
      },
      'Uses listings-service AI/heuristics based on Scope. You can edit the result before saving.',
    ),
    error
      ? React.createElement(
          'div',
          {
            style: {
              marginTop: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--theme-error-500, #b42318)',
            },
          },
          error,
        )
      : null,
  );
};

export default GenerateDeliverablesFromListingsButton;

