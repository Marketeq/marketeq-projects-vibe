"use client"

import { useCategoryPageL2 } from "../../src/features/category-pages/hook"

export default function TestL2Page() {
  // IMPORTANT: Check actual slugs in your Strapi admin first!
  // These might be "Creative" and "UI Design" with capitals/spaces
  const { data, isLoading, error } = useCategoryPageL2(
    "creative",
    "ui-design",
    {
      kind: "projects",
      limit: 10,
    }
  )

  if (isLoading) {
    return <div className="p-8 text-xl">Loading L2 category...</div>
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-xl text-red-600 font-bold mb-4">Error</div>
        <div className="bg-red-50 p-4 rounded border border-red-200">
          <pre className="text-sm">{error.message}</pre>
        </div>
        <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
          <p className="font-semibold mb-2">Possible reasons:</p>
          <ul className="list-disc pl-6 text-sm">
            <li>Check Strapi: Does &quot;UI Design&quot; category exist?</li>
            <li>
              Is the slug exactly &quot;ui-design&quot; (lowercase with hyphen)?
            </li>
            <li>
              Is &quot;Creative&quot; the parent of &quot;UI Design&quot;?
            </li>
            <li>Backend running on http://localhost:3002?</li>
          </ul>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8">No data</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 p-6 bg-green-50 border-2 border-green-500 rounded-lg">
        <h1 className="text-3xl font-bold text-green-800">
          L2 Integration Working!
        </h1>
        <p className="text-green-700 mt-2">
          Path: {data.breadcrumbs.map((b) => b.name).join(" → ")}
        </p>
        <p className="text-sm text-green-600 mt-1">
          GET /api/category-pages/creative/ui-design
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{data.category.name}</h2>
        {data.category.seo?.description && (
          <p className="text-gray-600">{data.category.seo.description}</p>
        )}
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h3 className="text-xl font-semibold mb-2">Breadcrumbs (L2)</h3>
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
          <p className="font-medium">{data.parent.name}</p>
        </div>
      )}

      {data.children && data.children.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Children (L3)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {data.children.map((child) => (
              <div
                key={child.uuid}
                className="p-3 bg-green-50 rounded border border-green-200"
              >
                {child.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">
          Content Blocks ({data.blocks.length})
        </h3>
        {data.blocks.length === 0 && (
          <p className="text-gray-500 italic">No blocks yet</p>
        )}
        {data.blocks.map((block) => (
          <div key={block.key} className="mb-4 p-4 border rounded bg-gray-50">
            <div className="font-semibold text-lg">{block.title}</div>
            <div className="text-sm text-gray-600">
              {block.entity} | {block.items.length} items
            </div>
          </div>
        ))}
      </div>

      <details className="mt-8 p-4 bg-gray-100 rounded">
        <summary className="cursor-pointer font-semibold">JSON</summary>
        <pre className="mt-4 p-4 bg-white rounded overflow-auto text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}
