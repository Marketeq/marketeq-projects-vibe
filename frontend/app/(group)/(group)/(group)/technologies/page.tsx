"use client"

import React, { useMemo, useState } from "react"
import { ArrowLeft, SearchMd, X } from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import {
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
} from "@/components/ui"

interface TechItem {
  name: string
  slug: string
}

/**
 * Master list of all technologies across the platform, grouped by category.
 * Mirrors CATEGORY_TECHNOLOGIES in the category page — keep in sync.
 */
const TECHNOLOGIES_BY_CATEGORY: Record<string, TechItem[]> = {
  "Design & Creative": [
    { name: "Figma", slug: "figma" },
    { name: "Sketch", slug: "sketch" },
    { name: "Adobe XD", slug: "adobexd" },
    { name: "Photoshop", slug: "adobephotoshop" },
    { name: "Illustrator", slug: "adobeillustrator" },
    { name: "InDesign", slug: "adobeindesign" },
    { name: "After Effects", slug: "adobeaftereffects" },
    { name: "Framer", slug: "framer" },
    { name: "InVision", slug: "invision" },
    { name: "Webflow", slug: "webflow" },
    { name: "Blender", slug: "blender" },
    { name: "Canva", slug: "canva" },
  ],
  "Software Development": [
    { name: "React", slug: "react" },
    { name: "Vue.js", slug: "vuedotjs" },
    { name: "Angular", slug: "angular" },
    { name: "Next.js", slug: "nextdotjs" },
    { name: "Node.js", slug: "nodedotjs" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Python", slug: "python" },
    { name: "Go", slug: "go" },
    { name: "Rust", slug: "rust" },
    { name: "Docker", slug: "docker" },
    { name: "Kubernetes", slug: "kubernetes" },
    { name: "PostgreSQL", slug: "postgresql" },
  ],
  "Data & Analytics": [
    { name: "Python", slug: "python" },
    { name: "R", slug: "r" },
    { name: "Tableau", slug: "tableau" },
    { name: "Power BI", slug: "powerbi" },
    { name: "Apache Spark", slug: "apachespark" },
    { name: "Snowflake", slug: "snowflake" },
    { name: "Databricks", slug: "databricks" },
    { name: "Jupyter", slug: "jupyter" },
    { name: "Pandas", slug: "pandas" },
    { name: "TensorFlow", slug: "tensorflow" },
    { name: "PyTorch", slug: "pytorch" },
    { name: "PostgreSQL", slug: "postgresql" },
  ],
  Marketing: [
    { name: "Google Analytics", slug: "googleanalytics" },
    { name: "HubSpot", slug: "hubspot" },
    { name: "Mailchimp", slug: "mailchimp" },
    { name: "Google Ads", slug: "googleads" },
    { name: "Meta", slug: "meta" },
    { name: "Salesforce", slug: "salesforce" },
    { name: "Semrush", slug: "semrush" },
    { name: "Ahrefs", slug: "ahrefs" },
    { name: "Hootsuite", slug: "hootsuite" },
    { name: "Zapier", slug: "zapier" },
    { name: "Canva", slug: "canva" },
    { name: "Notion", slug: "notion" },
  ],
  Writing: [
    { name: "Google Docs", slug: "googledocs" },
    { name: "Notion", slug: "notion" },
    { name: "Grammarly", slug: "grammarly" },
    { name: "WordPress", slug: "wordpress" },
    { name: "Medium", slug: "medium" },
    { name: "Substack", slug: "substack" },
    { name: "Ghost", slug: "ghost" },
    { name: "Contentful", slug: "contentful" },
    { name: "Dropbox Paper", slug: "dropbox" },
    { name: "Evernote", slug: "evernote" },
    { name: "Obsidian", slug: "obsidian" },
    { name: "Scribd", slug: "scribd" },
  ],
  Research: [
    { name: "Python", slug: "python" },
    { name: "R", slug: "r" },
    { name: "Jupyter", slug: "jupyter" },
    { name: "Tableau", slug: "tableau" },
    { name: "Pandas", slug: "pandas" },
    { name: "Kaggle", slug: "kaggle" },
    { name: "Google Scholar", slug: "googlescholar" },
    { name: "Mendeley", slug: "mendeley" },
    { name: "Zotero", slug: "zotero" },
    { name: "Overleaf", slug: "overleaf" },
    { name: "LaTeX", slug: "latex" },
    { name: "ORCID", slug: "orcid" },
  ],
  "Business & Consulting": [
    { name: "Excel", slug: "microsoftexcel" },
    { name: "PowerPoint", slug: "microsoftpowerpoint" },
    { name: "Notion", slug: "notion" },
    { name: "Salesforce", slug: "salesforce" },
    { name: "HubSpot", slug: "hubspot" },
    { name: "Slack", slug: "slack" },
    { name: "Asana", slug: "asana" },
    { name: "Trello", slug: "trello" },
    { name: "Jira", slug: "jira" },
    { name: "Monday", slug: "mondaydotcom" },
    { name: "Airtable", slug: "airtable" },
    { name: "Zoom", slug: "zoom" },
  ],
}

export default function TechnologiesPage() {
  const [query, setQuery] = useState("")

  /** Compute total unique techs (by name) across all categories */
  const totalUnique = useMemo(() => {
    const seen = new Set<string>()
    for (const list of Object.values(TECHNOLOGIES_BY_CATEGORY)) {
      for (const t of list) seen.add(t.name)
    }
    return seen.size
  }, [])

  /** Filter each category's techs by the search query */
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TECHNOLOGIES_BY_CATEGORY
    const out: Record<string, TechItem[]> = {}
    for (const [cat, list] of Object.entries(TECHNOLOGIES_BY_CATEGORY)) {
      const matched = list.filter((t) => t.name.toLowerCase().includes(q))
      if (matched.length > 0) out[cat] = matched
    }
    return out
  }, [query])

  const hasResults = Object.keys(filteredGroups).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-6 md:px-[50px] py-[50px]">
        {/* Header */}
        <div className="flex flex-col gap-y-4 md:flex-row md:items-end md:justify-between">
          <div>
            <NextLink
              href="/"
              className="inline-flex items-center gap-x-2 text-sm font-medium text-gray-500 hover:text-dark-blue-400 transition"
            >
              <ArrowLeft className="size-4" />
              Back
            </NextLink>
            <h1 className="mt-3 text-[32px] md:text-[40px] leading-tight font-bold text-dark-blue-400">
              Browse All Technologies
            </h1>
            <p className="mt-2 text-base text-gray-500 max-w-2xl">
              Explore the full set of tools, frameworks, and platforms our
              specialists work with — {totalUnique} technologies across{" "}
              {Object.keys(TECHNOLOGIES_BY_CATEGORY).length} categories.
            </p>
          </div>

          {/* Search */}
          <div className="md:w-[320px] w-full">
            <InputGroup>
              <InputLeftElement>
                <SearchMd className="size-[18px] text-gray-400" />
              </InputLeftElement>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search technologies..."
              />
              {query && (
                <InputRightElement>
                  <IconButton
                    type="button"
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </IconButton>
                </InputRightElement>
              )}
            </InputGroup>
          </div>
        </div>

        {/* Tech groups */}
        <div className="mt-10 flex flex-col gap-y-12">
          {hasResults ? (
            Object.entries(filteredGroups).map(([cat, techs]) => (
              <section key={cat}>
                <div className="flex items-end justify-between mb-6">
                  <h2 className="text-[22px] leading-none font-bold text-dark-blue-400">
                    {cat}
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    {techs.length} {techs.length === 1 ? "tool" : "tools"}
                  </span>
                </div>
                <div className="grid gap-[15px] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {techs.map((tech) => (
                    <NextLink
                      key={`${cat}-${tech.slug}`}
                      href={`/search?skill=${encodeURIComponent(tech.name)}`}
                      className="focus-visible:outline-none"
                    >
                      <article className="h-[100px] flex flex-col items-center justify-center gap-y-2 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] rounded-lg border border-gray-200 cursor-pointer hover:ring-1 hover:ring-gray-300 hover:-translate-y-0.5 transition duration-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://cdn.simpleicons.org/${tech.slug}`}
                          alt={tech.name}
                          width={32}
                          height={32}
                          className="size-8 shrink-0 object-contain"
                          loading="lazy"
                        />
                        <h3 className="text-xs font-medium leading-none text-dark-blue-400 text-center">
                          {tech.name}
                        </h3>
                      </article>
                    </NextLink>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="py-20 text-center">
              <p className="text-gray-500">
                No technologies match{" "}
                <span className="font-semibold text-dark-blue-400">
                  “{query}”
                </span>
              </p>
              <Button
                className="mt-4"
                variant="link"
                visual="gray"
                onClick={() => setQuery("")}
              >
                Clear search
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
