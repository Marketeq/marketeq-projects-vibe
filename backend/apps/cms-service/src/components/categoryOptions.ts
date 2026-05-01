import { getAutocompleteServiceBaseUrl } from "./autocompleteOptions";

type CategoryDoc = {
  id?: string | number;
  uuid?: string;
  name?: string;
  status?: string;
  sortOrder?: number | null;
  parent?:
    | {
        id?: string | number;
      }
    | string
    | number
    | null;
};

type CategoryTreeNode = {
  id?: string | number;
  uuid?: string;
  name: string;
  approved?: boolean;
  children?: CategoryTreeNode[];
};

let categoryTreeCache: CategoryTreeNode[] | null = null;
let categoryTreeCacheAt = 0;
let inFlightCategoryTree: Promise<CategoryTreeNode[]> | null = null;
const CATEGORY_TREE_CACHE_TTL_MS = 30_000;

export type CategoryOption = {
  label: string;
  value: string;
  depth: number;
  path: string[];
};

export type SuggestedCategoryOption = {
  category: string;
  subCategory: string;
};

function normalizeNodeName(value?: string): string {
  return (value || "").trim();
}

function isActiveTreeNode(node: CategoryTreeNode): boolean {
  return node.approved !== false;
}

function getUniqueOptions(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function flattenTreeOptions(
  entries: CategoryTreeNode[],
  parentPath: string[] = [],
  depth = 0,
): CategoryOption[] {
  const options: CategoryOption[] = [];

  entries.forEach((entry) => {
    if (!isActiveTreeNode(entry)) return;

    const name = normalizeNodeName(entry.name);
    if (!name) return;

    const path = [...parentPath, name];

    options.push({
      label: name,
      value: name,
      depth,
      path,
    });

    if (entry.children?.length) {
      options.push(...flattenTreeOptions(entry.children, path, depth + 1));
    }
  });

  return options;
}

function collectCategoryDescendants(node?: CategoryTreeNode): CategoryTreeNode[] {
  if (!node?.children?.length) return [];

  return node.children.flatMap((child) => {
    const descendants = collectCategoryDescendants(child);
    return isActiveTreeNode(child) ? [child, ...descendants] : descendants;
  });
}

function collectSelectableCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const secondLevelNodes = nodes.flatMap((node) =>
    (node.children ?? []).filter(isActiveTreeNode),
  );

  /**
   * "Category" selections must be nodes that actually have descendants to pick as
   * subcategories (matches `/publish-project`: pick a bucket, then scoped tags).
   * Otherwise picking a leaf (e.g. "Blog Writing") makes `subcategories` feel broken.
   */
  const withChildren = (
    candidates: CategoryTreeNode[],
  ): CategoryTreeNode[] =>
    candidates.filter((n) => isActiveTreeNode(n) && (n.children?.length ?? 0) > 0);

  const secondSelectable = withChildren(secondLevelNodes);
  if (secondSelectable.length > 0) {
    return secondSelectable;
  }

  const rootsWithChildren = withChildren(nodes);
  return rootsWithChildren.length ? rootsWithChildren : [];
}

function findSuggestedSubCategory(node?: CategoryTreeNode): string | null {
  const [firstDescendant] = collectCategoryDescendants(node);
  return firstDescendant?.name ?? null;
}

function indexCategoryTreeByName(nodes: CategoryTreeNode[]): Map<string, CategoryTreeNode> {
  const index = new Map<string, CategoryTreeNode>();

  const visit = (entries: CategoryTreeNode[]) => {
    entries.forEach((entry) => {
      if (isActiveTreeNode(entry)) {
        index.set(entry.name, entry);
      }

      if (entry.children?.length) {
        visit(entry.children);
      }
    });
  };

  visit(nodes);
  return index;
}

async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  const now = Date.now();
  if (
    categoryTreeCache &&
    now - categoryTreeCacheAt < CATEGORY_TREE_CACHE_TTL_MS
  ) {
    return categoryTreeCache;
  }
  if (inFlightCategoryTree) {
    return inFlightCategoryTree;
  }

  // IMPORTANT:
  // This runs in the browser (Payload admin). Calling category-service directly
  // is brittle (CORS + env var exposure + port drift). Instead, use the CMS
  // Categories collection as the source of truth for admin selection.
  inFlightCategoryTree = (async () => {
    const response = await fetch("/api/categories?limit=1000&depth=0");
    if (!response.ok) throw new Error(`Failed to load categories (${response.status})`);

    const data = (await response.json()) as { docs?: CategoryDoc[] } | CategoryDoc[];
    const docs: CategoryDoc[] = Array.isArray(data) ? data : (data.docs ?? []);

    const nodesById = new Map<string | number, CategoryTreeNode>();
    const childrenByParentId = new Map<string | number, CategoryTreeNode[]>();
    const roots: CategoryTreeNode[] = [];

    const getParentId = (doc: CategoryDoc): string | number | null => {
      const p = doc.parent as any;
      if (p == null) return null;
      if (typeof p === "string" || typeof p === "number") return p;
      if (typeof p === "object" && (typeof p.id === "string" || typeof p.id === "number")) return p.id;
      return null;
    };

    for (const doc of docs) {
      const id = doc.id;
      if (id == null) continue;
      const name = normalizeNodeName(doc.name);
      if (!name) continue;
      const approved = (doc.status ?? "active") !== "inactive";
      nodesById.set(id, { id, uuid: doc.uuid, name, approved, children: [] });
    }

    for (const doc of docs) {
      const id = doc.id;
      if (id == null) continue;
      const node = nodesById.get(id);
      if (!node) continue;
      const parentId = getParentId(doc);
      if (parentId == null) {
        roots.push(node);
        continue;
      }
      const arr = childrenByParentId.get(parentId) ?? [];
      arr.push(node);
      childrenByParentId.set(parentId, arr);
    }

    for (const [parentId, kids] of childrenByParentId.entries()) {
      const parent = nodesById.get(parentId);
      if (!parent) continue;
      parent.children = kids;
    }

    categoryTreeCache = roots;
    categoryTreeCacheAt = Date.now();
    return roots;
  })();

  try {
    return await inFlightCategoryTree;
  } finally {
    inFlightCategoryTree = null;
  }
}

function toCategoryOption(
  doc: CategoryDoc,
): (CategoryOption & { sortOrder: number }) | null {
  const value = doc.name?.trim() || "";
  if (!value) return null;

  return {
    label: value,
    value,
    depth: 0,
    path: [value],
    sortOrder:
      typeof doc.sortOrder === "number"
        ? doc.sortOrder
        : Number.MAX_SAFE_INTEGER,
  };
}

export async function loadCategoryOptions(): Promise<CategoryOption[]> {
  const tree = await fetchCategoryTree();
  const selectableCategories = collectSelectableCategories(tree);

  const seen = new Set<string>();
  const options: CategoryOption[] = [];

  selectableCategories.forEach((node) => {
    const name = normalizeNodeName(node.name);
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    options.push({
      label: name,
      value: name,
      depth: 0,
      path: [name],
    });
  });

  return options;
}

type AutocompleteCategoryHit = {
  value?: string;
  type?: string;
};

/**
 * Tree-scoped subcategories, merged with publish-project style
 * `GET /autocomplete/categories?q=` when the user types a query (same
 * autocomplete-service route the API gateway exposes to the frontend).
 */
export async function loadSubcategoryOptions(
  selectedCategories: string[],
  query: string,
): Promise<string[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const trimmedQuery = query.trim();

  const tree = await fetchCategoryTree();
  const index = indexCategoryTreeByName(tree);

  const values = selectedCategories.flatMap((categoryName) => {
    const categoryNode = index.get(categoryName);
    if (!categoryNode) return [];

    return collectCategoryDescendants(categoryNode).map((node) =>
      normalizeNodeName(node.name),
    );
  });

  const scoped = getUniqueOptions(values);
  const treeFiltered = scoped.filter((value) =>
    normalizedQuery ? value.toLowerCase().includes(normalizedQuery) : true,
  );

  const parent = selectedCategories[0]?.trim() ?? "";
  if (!trimmedQuery || !parent) {
    return treeFiltered;
  }

  const allowedSet = new Set(scoped.map((s) => s.toLowerCase()));
  const hasScope = allowedSet.size > 0;

  try {
    const base = getAutocompleteServiceBaseUrl().replace(/\/$/, "");
    const res = await fetch(
      `${base}/autocomplete/categories?q=${encodeURIComponent(trimmedQuery)}`,
    );
    if (!res.ok) {
      return treeFiltered;
    }
    const payload = (await res.json()) as unknown;
    const rows = Array.isArray(payload) ? (payload as AutocompleteCategoryHit[]) : [];
    const fromApi = getUniqueOptions(
      rows
        .filter((r) => r.type === "subcategory" && typeof r.value === "string")
        .map((r) => (r.value as string).trim())
        .filter((v) => (hasScope ? allowedSet.has(v.toLowerCase()) : true)),
    );
    if (fromApi.length > 0) {
      return fromApi;
    }
  } catch {
    // Same as publish-project: fall back to tree-derived options.
  }

  return treeFiltered;
}

export async function loadSuggestedCategoryOptions(): Promise<
  SuggestedCategoryOption[]
> {
  const tree = await fetchCategoryTree();
  const selectableCategories = collectSelectableCategories(tree);

  const seen = new Set<string>();
  const suggested: SuggestedCategoryOption[] = [];

  selectableCategories.forEach((node) => {
    const category = normalizeNodeName(node.name);
    const subCategory = normalizeNodeName(findSuggestedSubCategory(node) || "");

    if (!category || !subCategory) return;

    const key = `${category.toLowerCase()}::${subCategory.toLowerCase()}`;
    if (seen.has(key)) return;

    seen.add(key);
    suggested.push({ category, subCategory });
  });

  return suggested;
}
