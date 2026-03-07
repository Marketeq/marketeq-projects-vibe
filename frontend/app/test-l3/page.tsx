"use client"

import { useCategoryPageL3 } from "../../src/features/category-pages/hook"

export default function TestL3Page() {
  const { data, isLoading, error } = useCategoryPageL3(
    "creative", 
    "ui-design", 
    "mobile-ui",
    { kind: "projects", limit: 10 }
  )

  if (isLoading) {
    return <div className="p-8 text-xl">Loading L3...</div>
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-xl text-red-600 font-bold">Error</div>
        <pre className="mt-4 p-4 bg-red-50">{error.message}</pre>
      </div>
    )
  }

  if (!data) return <div className="p-8">No data</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 p-6 bg-green-50 border-2 border-green-500 rounded">
        <h1 className="text-3xl font-bold text-green-800">
          L3 Integration Working!
        </h1>
        <p className="text-green-700 mt-2">
          Full Path: {data.breadcrumbs.map(b => b.name).join(" → ")}
        </p>
        <p className="text-sm text-green-600 mt-1">
          GET /api/category-pages/creative/ui-design/mobile-ui
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h3 className="text-xl font-semibold mb-2">Breadcrumbs (L3)</h3>
        <div className="flex gap-2">
          {data.breadcrumbs.map((bc, i) => (
            <span key={bc.uuid} className="font-medium">
              {bc.name}
              {i < data.breadcrumbs.length - 1 && " → "}
            </span>
          ))}
        </div>
      </div>

      {data.parent && (
        <div className="mb-6 p-4 bg-purple-50 rounded">
          <h3 className="text-xl font-semibold mb-2">Parent</h3>
          <p>{data.parent.name}</p>
        </div>
      )}

      <details className="mt-8 p-4 bg-gray-100 rounded">
        <summary className="cursor-pointer font-semibold">JSON</summary>
        <pre className="mt-4 p-4 bg-white text-xs overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}