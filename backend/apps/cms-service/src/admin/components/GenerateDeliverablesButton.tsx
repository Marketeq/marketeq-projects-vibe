import React from 'react'
import { useForm, useFormFields } from 'payload/components/forms'

function getProjectIdFromAdminUrl(pathname: string): string | null {
  const m = pathname.match(/\/collections\/projects\/([^/]+)/)
  return m?.[1] ?? null
}

export function GenerateDeliverablesButton(): React.ReactElement | null {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const { getFields } = useForm()
  const dispatchFields = useFormFields(([_, dispatch]) => dispatch)

  const projectId =
    typeof window !== 'undefined' ? getProjectIdFromAdminUrl(window.location.pathname) : null

  if (!projectId) return null

  const onClick = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fields = getFields()
      console.log('GenerateDeliverablesButton - raw fields:', fields);

      // Helper to dynamically count array items by examining keys
      const getArrayLength = (prefix: string) => {
        let maxIdx = -1;
        for (const key of Object.keys(fields)) {
          if (key.startsWith(prefix + '.')) {
            const parts = key.slice(prefix.length + 1).split('.');
            const idx = parseInt(parts[0], 10);
            if (!isNaN(idx) && idx > maxIdx) {
              maxIdx = idx;
            }
          }
        }
        return maxIdx + 1;
      };

      const publishScope = []
      
      const rowCount = getArrayLength('publishScope')
      for (let i = 0; i < rowCount; i++) {
        const phaseName = fields[`publishScope.${i}.name`]?.value
        const stageName = fields[`publishScope.${i}.stageName`]?.value
        const order = fields[`publishScope.${i}.order`]?.value
        const taskCount = getArrayLength(`publishScope.${i}.tasks`)
        const tasks = []
        for (let j = 0; j < taskCount; j++) {
          tasks.push({
            taskName: fields[`publishScope.${i}.tasks.${j}.taskName`]?.value,
            role: fields[`publishScope.${i}.tasks.${j}.role`]?.value,
            location: fields[`publishScope.${i}.tasks.${j}.location`]?.value 
              ? Array.from({ length: getArrayLength(`publishScope.${i}.tasks.${j}.location`) }).map((_, k) => ({ value: fields[`publishScope.${i}.tasks.${j}.location.${k}.value`]?.value }))
              : [],
            experienceLevel: fields[`publishScope.${i}.tasks.${j}.experienceLevel`]?.value,
            duration: {
              value: fields[`publishScope.${i}.tasks.${j}.duration.value`]?.value,
              type: fields[`publishScope.${i}.tasks.${j}.duration.type`]?.value,
            }
          })
        }
        publishScope.push({ name: phaseName, stageName, order, tasks })
      }

      console.log('GenerateDeliverablesButton - reconstructed publishScope:', publishScope);

      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/generate-deliverables`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publishScope }),
        },
      )
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Request failed (${res.status})`)
      }
      
      const data = await res.json()
      console.log('GenerateDeliverablesButton - API response:', data);
      if (data.ok) {
        // We dispatch the fields just in case, but rely on window.location.reload() 
        // to forcefully show the newly saved deliverables in the Lexical editor.
        if (data.deliverablesLexical && typeof dispatchFields === 'function') {
          dispatchFields({
            type: 'UPDATE',
            path: 'deliverables',
            value: data.deliverablesLexical,
          })
        }
        window.location.reload()
      } else {
        throw new Error(data.error || 'Failed to generate deliverables')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate deliverables')
    } finally {
      setIsLoading(false)
    }
  }

  return React.createElement(
    'div',
    { style: { marginTop: 8 } },
    React.createElement(
      'button',
      { type: 'button', onClick, disabled: isLoading },
      isLoading ? 'Generating…' : 'Generate deliverables from scope',
    ),
    error
      ? React.createElement(
          'div',
          { style: { marginTop: 8, color: 'var(--theme-error-500, #c00)' } },
          error,
        )
      : null,
    React.createElement(
      'div',
      { style: { marginTop: 8, opacity: 0.75 } },
      'Uses the current Scope in the form. You don\'t need to save first.',
    ),
  )
}

