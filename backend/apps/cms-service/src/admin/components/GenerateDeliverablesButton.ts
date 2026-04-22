import React from 'react'

function getProjectIdFromAdminUrl(pathname: string): string | null {
  const m = pathname.match(/\/collections\/projects\/([^/]+)/)
  return m?.[1] ?? null
}

export function GenerateDeliverablesButton(): React.ReactElement | null {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const projectId =
    typeof window !== 'undefined' ? getProjectIdFromAdminUrl(window.location.pathname) : null

  if (!projectId) return null

  const onClick = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/generate-deliverables`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
        },
      )
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Request failed (${res.status})`)
      }
      window.location.reload()
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
      'Uses the saved Scope. Save Scope changes first, then click generate.',
    ),
  )
}

