"use client"

import { CategoryAPI, type CategoryTreeNode } from "@/service/http/category"
import {
  type CategoryScope,
  type CategoryValuesResponse,
  SearchAPI,
} from "@/service/http/search"
import { useQuery } from "@tanstack/react-query"

export type { CategoryTreeNode, CategoryScope }

/**
 * Shared by every category/subcategory filter control across all four
 * sidebars — same react-query cache key means the tree is fetched once per
 * page regardless of how many controls mount it.
 */
export function useCategoryTree(enabled = true) {
  return useQuery({
    queryKey: ["category-tree"],
    queryFn: async () => {
      const response = await CategoryAPI.getTree()
      return Array.isArray(response?.data)
        ? (response.data as CategoryTreeNode[])
        : []
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * The taxonomy names that entity's records actually carry — projects,
 * services and talent each get their own set.
 *
 * The taxonomy tree is global: every category in it is offered to every
 * sidebar, including branches with nothing of that entity behind them.
 * Pairing this with pruneTreeToNames narrows the tree per entity, so the
 * sidebars stop showing each other's categories and picking a branch can't
 * land on zero results. Names shared by several entities show up in each
 * response, which is intended.
 *
 * The names arrive as a flat list with no depth attached, which is what lets
 * one hook serve entities that record their category at different levels:
 * projects and services file a single (usually leaf) name, talent files broad
 * disciplines and specializations. pruneTreeToNames reads the depth off the
 * tree instead, so the shape of the resulting control follows the data.
 */
export function useAvailableCategoryNames(scope?: CategoryScope) {
  return useQuery({
    queryKey: ["category-values", scope],
    queryFn: async () => {
      const response = await SearchAPI.getCategoryValues(scope as CategoryScope)
      const values = (response?.data as CategoryValuesResponse | undefined)
        ?.values
      return Array.isArray(values) ? values : []
    },
    enabled: Boolean(scope),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Copy of `nodes` keeping only branches that lead to a name in `names` — a
 * node survives when a listing is filed under it directly or under any of its
 * descendants, so parent categories stay reachable while dead branches drop
 * out entirely.
 *
 * Matching is case-insensitive because the listing's stored category name and
 * the taxonomy's own name are compared case-insensitively everywhere else too
 * (the DB fallback lowercases both sides, Algolia facet matching is
 * case-insensitive), and pruning on an exact match would silently drop live
 * categories over a capitalization difference.
 */
export function pruneTreeToNames(
  nodes: CategoryTreeNode[] | undefined,
  names: Set<string>
): CategoryTreeNode[] {
  if (!Array.isArray(nodes)) return []
  const kept: CategoryTreeNode[] = []
  for (const node of nodes) {
    const children = pruneTreeToNames(node.children, names)
    const hasOwnListings = names.has(normalizeName(node.name))
    if (hasOwnListings || children.length > 0) {
      kept.push({ ...node, children })
    }
  }
  return kept
}

/** Lookup key used on both sides of the pruning comparison. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

const ACRONYMS = new Set([
  "ai",
  "ml",
  "ui",
  "ux",
  "api",
  "iot",
  "it",
  "seo",
  "etl",
  "saas",
  "mvp",
])

/**
 * Turns a raw DB category name into a human-readable display name with
 * proper word capitalization.
 *
 * Examples:
 *   "e-commerce"       → "E-Commerce"
 *   "ai-ml"            → "AI-ML"
 *   "healthcare it"    → "Healthcare IT"
 *   "software-development" → "Software Development"
 */
function formatCategoryDisplayName(raw: string): string {
  const hyphenated = raw.replace(/[_-]/g, "-")
  const parts = hyphenated.includes("-")
    ? hyphenated.split("-")
    : raw.split(/\s+/)

  return parts
    .map((part) => {
      if (!part) return ""
      const lower = part.toLowerCase()
      if (ACRONYMS.has(lower)) return lower.toUpperCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(hyphenated.includes("-") ? "-" : " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Collects every node name from the tree (the node itself and all descendants)
 * into a set, normalized for comparison.
 */
function collectAllNames(nodes: CategoryTreeNode[] | undefined): Set<string> {
  const names = new Set<string>()
  const walk = (items?: CategoryTreeNode[]) => {
    if (!Array.isArray(items)) return
    for (const node of items) {
      names.add(normalizeName(node.name))
      walk(node.children)
    }
  }
  walk(nodes)
  return names
}

/**
 * Finds names from `available` that don't match any node in the taxonomy tree
 * and returns them as flat pseudo-nodes.
 *
 * This handles the case where publishers file listings under category names
 * that don't yet exist in the taxonomy — those categories would otherwise be
 * invisible in the dropdown.
 *
 * Names are deduplicated by their normalized form and displayed with proper
 * capitalization.
 */
export function orphanCategoryNodes(
  tree: CategoryTreeNode[] | undefined,
  availableNames: string[]
): CategoryTreeNode[] {
  if (!availableNames.length || !Array.isArray(tree)) return []
  const treeNames = collectAllNames(tree)

  const deduped = new Map<string, { raw: string; display: string }>()
  for (const raw of availableNames) {
    const norm = normalizeName(raw)
    if (treeNames.has(norm)) continue
    if (!deduped.has(norm)) {
      deduped.set(norm, { raw, display: formatCategoryDisplayName(raw) })
    }
  }

  if (!deduped.size) return []

  return [...deduped.entries()].map(([norm, { display }]) => ({
    uuid: `orphan-${norm}`,
    name: display,
    slug: norm,
    approved: true,
    published_in_marketplace: true,
    children: [],
  }))
}

/**
 * `node`'s own display name plus every descendant's, deduped.
 *
 * Listings are matched by category NAME, and a listing filed under a deeper
 * node (e.g. "Machine Learning") does not carry its ancestors' names, so
 * selecting "Data Science" only returns everything under it if the whole
 * subtree of names is OR'd into the filter.
 */
export function collectSubtreeNames(node: CategoryTreeNode): string[] {
  const names = [
    node.name,
    ...flattenDescendants(node).map((child) => child.name),
  ]
  return Array.from(new Set(names.filter(Boolean)))
}

/**
 * The nodes a stored name list actually stands for, shallowest first.
 *
 * Filter state is a flat list of category names — every pick expanded into
 * its own name plus its descendants' (see collectSubtreeNames) — so which
 * nodes were clicked has to be read back out of it. A node was picked exactly
 * when its whole subtree of names is present; when only part of it is, the
 * pick is somewhere further down, so the walk descends instead of claiming
 * the parent. That keeps several picks recoverable from one flat list, which
 * is what lets the deepest level be multi-selected.
 *
 * Nodes are deduped by name because the taxonomy repeats some names across
 * branches ("Machine Learning" sits under both Data Science and Development)
 * and the filter matches by name — two nodes sharing a name are one pick as
 * far as results are concerned, so they must not read back as two.
 */
export function findSelectedNodes(
  roots: CategoryTreeNode[] | undefined,
  selectedNames: string[]
): CategoryTreeNode[] {
  if (!Array.isArray(roots) || selectedNames.length === 0) return []
  const selected = new Set(selectedNames.map(normalizeName))
  const picked: CategoryTreeNode[] = []
  const seen = new Set<string>()

  const walk = (nodes: CategoryTreeNode[]) => {
    for (const node of nodes) {
      const isWhollySelected = collectSubtreeNames(node).every((name) =>
        selected.has(normalizeName(name))
      )
      if (!isWhollySelected) {
        walk(node.children ?? [])
        continue
      }
      const key = normalizeName(node.name)
      if (seen.has(key)) continue
      seen.add(key)
      picked.push(node)
    }
  }

  walk(roots)
  return picked
}

/**
 * The deepest chain of nodes every one of `nodes` sits under, that chain
 * including a node itself when it is the only one.
 *
 * With one pick this is just its path (what the breadcrumbs have always
 * shown). With several it collapses to the branch they share — two leaves
 * under Mobile Development still read as "inside Mobile Development", while
 * picks spread across different branches leave no crumb at all, since there
 * is no single place the selection is "inside" any more.
 */
export function commonAncestorPath(
  roots: CategoryTreeNode[] | undefined,
  nodes: CategoryTreeNode[]
): CategoryTreeNode[] {
  if (!Array.isArray(roots) || nodes.length === 0) return []
  const paths = nodes.map((node) => findNodePath(roots, node.name))
  if (paths.some((path) => path.length === 0)) return []

  const shortest = Math.min(...paths.map((path) => path.length))
  const shared: CategoryTreeNode[] = []
  for (let depth = 0; depth < shortest; depth++) {
    const candidate = paths[0][depth]
    if (!paths.every((path) => path[depth].uuid === candidate.uuid)) break
    shared.push(candidate)
  }
  return shared
}

/** True when `node` sits somewhere beneath `ancestor` in the tree. */
export function isDescendantOf(
  node: CategoryTreeNode,
  ancestor: CategoryTreeNode
): boolean {
  return flattenDescendants(ancestor).some(
    (child) => normalizeName(child.name) === normalizeName(node.name)
  )
}

/**
 * Chain of nodes from `roots` down to the one named `name`, that node last;
 * empty when the name isn't in the tree.
 *
 * Filter state records only names, so the levels above a pick — the ones the
 * breadcrumbs show — have to be recovered from the tree.
 */
export function findNodePath(
  roots: CategoryTreeNode[] | undefined,
  name: string
): CategoryTreeNode[] {
  if (!Array.isArray(roots) || !name) return []
  for (const node of roots) {
    if (node.name === name) return [node]
    const below = findNodePath(node.children, name)
    if (below.length) return [node, ...below]
  }
  return []
}

/** Flattens every descendant (not just direct children) of `node`, node itself excluded. */
export function flattenDescendants(node: CategoryTreeNode): CategoryTreeNode[] {
  const out: CategoryTreeNode[] = []
  const walk = (nodes?: CategoryTreeNode[]) => {
    if (!Array.isArray(nodes)) return
    for (const child of nodes) {
      out.push(child)
      walk(child.children)
    }
  }
  walk(node.children)
  return out
}
