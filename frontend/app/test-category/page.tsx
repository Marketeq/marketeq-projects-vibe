"use client"

import { useCategoryPageL1 } from "../../src/features/category-pages/hook"

export default function TestCategoryPage() {
  const { data, isLoading, error } = useCategoryPageL1("creative", { 
    kind: "projects", 
    limit: 10 
  })

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-xl">Loading category data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-xl text-red-600 font-bold mb-4">Error</div>
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <pre className="text-sm">{error.message}</pre>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Make sure your backend is running on http://localhost:3002
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="p-8">No data received</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
        <h1 className="text-3xl font-bold text-green-800">
          Backend Integration Working!
        </h1>
        <p className="text-green-700 mt-2">
          Successfully fetched data from: GET /api/category-pages/creative
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{data.category.name}</h2>
        {data.category.seo?.description && (
          <p className="text-gray-600">{data.category.seo.description}</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Breadcrumbs</h3>
        <div className="flex gap-2 text-sm">
          {data.breadcrumbs.map((bc, i) => (
            <span key={bc.uuid}>
              {bc.name}
              {i < data.breadcrumbs.length - 1 && " → "}
            </span>
          ))}
        </div>
      </div>

      {data.children && data.children.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Child Categories ({data.children.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {data.children.map(child => (
              <div key={child.uuid} className="p-3 bg-blue-50 rounded border border-blue-200">
                {child.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Content Blocks ({data.blocks.length})</h3>
        {data.blocks.map(block => (
          <div key={block.key} className="mb-4 p-4 border rounded bg-gray-50">
            <div className="font-semibold text-lg">{block.title}</div>
            <div className="text-sm text-gray-600 mt-1">
              Entity: {block.entity} | Items: {block.items.length}
              {block.pagination?.hasMore && " | Has more pages"}
            </div>
            {block.description && (
              <div className="text-sm mt-2">{block.description}</div>
            )}
          </div>
        ))}
      </div>

      <details className="mt-8 p-4 bg-gray-100 rounded">
        <summary className="cursor-pointer font-semibold text-lg">
          View Full JSON Response
        </summary>
        <pre className="mt-4 p-4 bg-white rounded overflow-auto text-xs border">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}