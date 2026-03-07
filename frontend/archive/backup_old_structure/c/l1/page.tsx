"use client"
import React from "react"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

interface CategoryData {
  category: {
    uuid: string
    name: string
    slug: string
    seo?: {
      title?: string
      description?: string
    }
  }
  breadcrumbs: Array<{
    uuid: string
    name: string
    slug: string
  }>
  children?: Array<{
    uuid: string
    name: string
    slug: string
  }>
  blocks: Array<{
    key: string
    entity: string
    title: string
    description?: string
    items: any[]
    pagination?: {
      nextCursor?: string
      hasMore: boolean
    }
  }>
}

export default function CategoryL1Page() {
  const params = useParams()
  const l1 = params.l1 as string
  
  const [data, setData] = useState<CategoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with your actual backend URL
    const apiUrl = `http://localhost:3002/api/category-pages/${l1}`
    
    fetch(apiUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('API Error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [l1])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-800">Loading...</div>
          <div className="text-sm text-gray-500 mt-2">Fetching category data</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-red-50 border-2 border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Category</h2>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-gray-600 mt-4">
            Make sure your backend is running on port 3000
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl text-gray-600">Category not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm mb-4 text-blue-100">
            <a href="/" className="hover:text-white">Home</a>
            {data.breadcrumbs.map((crumb, i) => (
              <span key={crumb.uuid} className="flex items-center gap-2">
                <span>/</span>
                <span className={i === data.breadcrumbs.length - 1 ? 'text-white font-medium' : ''}>
                  {crumb.name}
                </span>
              </span>
            ))}
          </nav>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-2">{data.category.name}</h1>
          {data.category.seo?.description && (
            <p className="text-lg text-blue-100">{data.category.seo.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Child Categories */}
        {data.children && data.children.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Explore {data.category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {data.children.map(child => (
                
                  key={child.uuid}
                  href={`/c/${l1}/${child.slug}`}
                  className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                    {child.name}
                  </h3>
                  <div className="mt-2 text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore →
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Content Blocks */}
        {data.blocks.map(block => (
          <div key={block.key} className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{block.title}</h2>
                {block.description && (
                  <p className="text-gray-600 mt-1">{block.description}</p>
                )}
              </div>
              {block.pagination?.hasMore && (
                
                  href={`/c/${l1}?kind=${block.entity}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {block.items.slice(0, 8).map((item, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Placeholder Image */}
                  <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.title || `${block.entity} ${i + 1}`}
                    </h3>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      {item.rating && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <span>⭐</span>
                          <span className="font-medium text-gray-900">{item.rating}</span>
                        </div>
                      )}
                      
                      {item.price && (
                        <div className="font-semibold text-gray-900">
                          ${item.price}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {block.pagination?.hasMore && (
              <div className="mt-6 text-center">
                <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Load More {block.entity}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Debug Info (remove in production) */}
        <div className="mt-16 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <details>
            <summary className="cursor-pointer font-medium text-gray-700">
              🔍 Debug: API Response Data
            </summary>
            <pre className="mt-4 text-xs text-gray-600 overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}