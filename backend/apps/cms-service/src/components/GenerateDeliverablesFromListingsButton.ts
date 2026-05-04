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
  const [warning, setWarning] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

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
          setWarning(null);
          setSuccess(null);
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(
              `/api/projects/${encodeURIComponent(String(id))}/generate-deliverables`,
              {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'content-type': 'application/json' },
                signal: controller.signal,
              },
            ).finally(() => clearTimeout(timeout));
            if (!res.ok) {
              const txt = await res.text();
              throw new Error(txt || `HTTP ${res.status}`);
            }
            const json = (await res.json()) as {
              deliverables?: unknown;
              persisted?: boolean;
              warning?: string;
            };
            const nextDeliverables = Array.isArray(json.deliverables)
              ? [...json.deliverables]
              : [];
            setDeliverables(nextDeliverables);
            setSuccess('Deliverables generated and UI updated.');
            if (json.persisted === false) {
              setWarning(
                json.warning ??
                  'Deliverables were generated, but auto-save failed. Please publish changes manually.',
              );
            }
          } catch (e) {
            setError(
              e instanceof Error ? e.message : 'Failed to generate deliverables',
            );
          } finally {
            setBusy(false);
          }
        },
      },
      React.createElement(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          },
        },
        React.createElement('span', {
          'aria-hidden': 'true',
          style: {
            width: '0.8rem',
            height: '0.8rem',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '999px',
            display: 'inline-block',
            animation: 'marketeq-deliverables-spin 0.7s linear infinite',
            visibility: busy ? 'visible' : 'hidden',
          },
        }),
        React.createElement(
          'span',
          null,
          busy
            ? 'Generating...'
            : hasDeliverables
              ? 'Regenerate Deliverables'
              : 'Generate Deliverables',
        ),
      ),
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
    warning
      ? React.createElement(
          'div',
          {
            style: {
              marginTop: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--theme-warning-700, #b54708)',
            },
          },
          warning,
        )
      : null,
    success && !warning && !error
      ? React.createElement(
          'div',
          {
            style: {
              marginTop: '0.35rem',
              fontSize: '0.8rem',
              color: 'var(--theme-success-700, #067647)',
            },
          },
          success,
        )
      : null,
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
    React.createElement(
      'style',
      null,
      `@keyframes marketeq-deliverables-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }`,
    ),
  );
};

export default GenerateDeliverablesFromListingsButton;

