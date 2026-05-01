import React from "react";
import { useField } from "payload/components/forms";
import { useDocumentInfo } from "payload/components/utilities";

import {
  loadCategoryOptions,
  loadSubcategoryOptions,
  type CategoryOption,
} from "./categoryOptions";

import "./CategoryFields.scss";

const B = "marketeq-categoryField";
const ROW_COUNT = 3;
const MAX_SUBCATEGORIES = 5;

type CategoryRow = {
  id?: string;
  value?: string;
  subcategories?: Array<{ id?: string; value?: string }>;
};

type RowUiState = {
  inputValue: string;
  searchOptions: string[];
  quickSuggestions: string[];
  scopeReady: boolean;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRows(raw: unknown): CategoryRow[] {
  let rowsRaw: unknown = raw;
  if (!Array.isArray(rowsRaw) && rowsRaw && typeof rowsRaw === "object") {
    const anyRaw = rowsRaw as any;
    if (Array.isArray(anyRaw.rows)) rowsRaw = anyRaw.rows;
    else if (Array.isArray(anyRaw.value)) rowsRaw = anyRaw.value;
  }
  if (typeof rowsRaw === "string") {
    try {
      rowsRaw = JSON.parse(rowsRaw);
    } catch {
      // ignore
    }
  }
  if (!Array.isArray(rowsRaw)) return [];

  return rowsRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const value = typeof (row as any).value === "string" ? normalizeText((row as any).value) : "";
      const subcategories = Array.isArray((row as any).subcategories)
        ? (row as any).subcategories
            .map((sub: any) => {
              const subValue =
                typeof sub?.value === "string" ? normalizeText(sub.value) : "";
              if (!subValue) return null;
              return typeof sub?.id === "string"
                ? { id: sub.id as string, value: subValue }
                : { value: subValue };
            })
            .filter(Boolean)
        : [];

      return typeof (row as any).id === "string"
        ? ({ id: (row as any).id as string, value, subcategories } as CategoryRow)
        : ({ value, subcategories } as CategoryRow);
    })
    .filter((row): row is CategoryRow => row !== null);
}

function dedupeStrings(values: string[], limit = MAX_SUBCATEGORIES): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = normalizeText(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeSubRows(
  values: Array<{ id?: string; value?: string }> | undefined,
): Array<{ id?: string; value?: string }> {
  const seen = new Set<string>();
  const out: Array<{ id?: string; value?: string }> = [];
  for (const row of Array.isArray(values) ? values : []) {
    const value = typeof row?.value === "string" ? normalizeText(row.value) : "";
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row?.id ? { id: row.id, value } : { value });
    if (out.length >= MAX_SUBCATEGORIES) break;
  }
  return out;
}

function ensureRowCount(rows: CategoryRow[]): CategoryRow[] {
  const next = rows.slice(0, ROW_COUNT).map((row) => ({
    ...row,
    value: typeof row.value === "string" ? normalizeText(row.value) : "",
    subcategories: normalizeSubRows(row.subcategories),
  }));
  while (next.length < ROW_COUNT) {
    next.push({ value: "", subcategories: [] });
  }
  return next;
}

function dedupeMainCategories(rows: CategoryRow[]): CategoryRow[] {
  const seen = new Set<string>();
  let changed = false;
  const next = rows.map((row) => {
    const value = typeof row.value === "string" ? normalizeText(row.value) : "";
    if (!value) return { ...row, value: "", subcategories: normalizeSubRows(row.subcategories) };
    const key = value.toLowerCase();
    if (seen.has(key)) {
      changed = true;
      return { ...row, value: "", subcategories: [] };
    }
    seen.add(key);
    return { ...row, value, subcategories: normalizeSubRows(row.subcategories) };
  });
  return changed ? next : next;
}

function finalizeRows(rows: CategoryRow[]): CategoryRow[] {
  return dedupeMainCategories(ensureRowCount(rows));
}

function rowsKey(rows: CategoryRow[]): string {
  return rows
    .map((row) => {
      const value = normalizeText(row.value ?? "").toLowerCase();
      const subs = normalizeSubRows(row.subcategories)
        .map((sub) => normalizeText(sub.value ?? "").toLowerCase())
        .join(",");
      return `${value}:${subs}`;
    })
    .join("|");
}

function getValueAtPath(doc: unknown, path: string): unknown {
  if (!doc || typeof doc !== "object") return undefined;
  const parts = path.split(".").filter(Boolean);
  let current: any = doc;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function makeEmptyUiState(): RowUiState[] {
  return Array.from({ length: ROW_COUNT }, () => ({
    inputValue: "",
    searchOptions: [],
    quickSuggestions: [],
    scopeReady: false,
  }));
}

function hasMeaningfulRows(rows: CategoryRow[]): boolean {
  return rows.some(
    (row) =>
      normalizeText(row.value ?? "").length > 0 ||
      normalizeSubRows(row.subcategories).length > 0,
  );
}

function tokens(value: string): string[] {
  return normalizeText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export default function ProjectCategoriesField({
  path,
  label = "Categories",
}: {
  path: string;
  label?: string;
}) {
  const { value, setValue } = useField<unknown>({ path });
  const docInfo = useDocumentInfo();

  const [categoryOptions, setCategoryOptions] = React.useState<CategoryOption[]>([]);
  const [ui, setUi] = React.useState<RowUiState[]>(makeEmptyUiState);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const rows = React.useMemo(() => finalizeRows(normalizeRows(value)), [value]);
  const rowsRef = React.useRef<CategoryRow[]>(rows);

  React.useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const loaded = await loadCategoryOptions();
        if (!cancelled) {
          setCategoryOptions(loaded);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load categories");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const inferMissingCategories = async (rawRows: CategoryRow[]): Promise<CategoryRow[]> => {
          const options = await loadCategoryOptions();
          if (!options.length) return rawRows;

          const inferred = await Promise.all(
            rawRows.map(async (row) => {
              const currentValue = normalizeText(row.value ?? "");
              const subs = normalizeSubRows(row.subcategories).map((s) => normalizeText(s.value ?? ""));
              if (currentValue || subs.length === 0) return row;

              const firstSub = subs[0];
              let bestMatch: { category: string; score: number } | null = null;
              for (const option of options) {
                try {
                  const scoped = await loadSubcategoryOptions([option.value], "");
                  const exact = scoped.some(
                    (entry) =>
                      normalizeText(entry).toLowerCase() === firstSub.toLowerCase(),
                  );
                  if (exact) {
                    return { ...row, value: option.value };
                  }

                  const firstTokens = new Set(tokens(firstSub));
                  for (const entry of scoped) {
                    const overlap = tokens(entry).filter((t) =>
                      firstTokens.has(t),
                    ).length;
                    if (!bestMatch || overlap > bestMatch.score) {
                      bestMatch = { category: option.value, score: overlap };
                    }
                  }
                } catch {
                  // continue trying other options
                }
              }
              return bestMatch && bestMatch.score > 0
                ? { ...row, value: bestMatch.category }
                : row;
            }),
          );

          return inferred;
        };

        const normalizedCurrent = finalizeRows(normalizeRows(value));
        const hasMeaningfulCurrentData = hasMeaningfulRows(normalizedCurrent);
        if (hasMeaningfulCurrentData) return;
        const id = (docInfo as any)?.id ?? (docInfo as any)?.docID ?? null;
        if (!id) return;
        const pathName = typeof window !== "undefined" ? window.location.pathname : "";
        const match = pathName.match(/\/admin\/collections\/([^/]+)\/([^/]+)/);
        const collection = match?.[1];
        if (!collection) return;
        const res = await fetch(`/api/${collection}/${encodeURIComponent(String(id))}?depth=0`);
        if (!res.ok) return;
        const doc = (await res.json()) as any;
        let hydrated = finalizeRows(normalizeRows(getValueAtPath(doc, path)));

        // If draft payload is empty, fallback to published snapshot.
        if (!hasMeaningfulRows(hydrated) && collection === "projects") {
          const publishedRes = await fetch(
            `/api/projects?depth=0&limit=1&where[id][equals]=${encodeURIComponent(String(id))}&where[_status][equals]=published`,
          );
          if (publishedRes.ok) {
            const publishedJson = (await publishedRes.json()) as any;
            const publishedDoc = Array.isArray(publishedJson?.docs)
              ? publishedJson.docs[0]
              : undefined;
            if (publishedDoc) {
              hydrated = finalizeRows(normalizeRows(getValueAtPath(publishedDoc, path)));
            }
          }
        }

        if (!cancelled && hasMeaningfulRows(hydrated)) {
          const withInferredCategories = finalizeRows(
            await inferMissingCategories(hydrated),
          );
          const currentKey = rowsKey(normalizedCurrent);
          const hydratedKey = rowsKey(withInferredCategories);
          if (currentKey !== hydratedKey) {
            setValue(withInferredCategories as any);
          }
        }
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [docInfo, path, setValue, value]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const nextUi = await Promise.all(
        rows.map(async (row, index) => {
          const current = ui[index] ?? makeEmptyUiState()[0];
          const selected = normalizeText(row.value ?? "");
          if (!selected) {
            return { ...current, searchOptions: [], quickSuggestions: [], scopeReady: false };
          }
          try {
            const [quickSuggestions, searchOptions] = await Promise.all([
              loadSubcategoryOptions([selected], ""),
              loadSubcategoryOptions([selected], current.inputValue),
            ]);
            return {
              ...current,
              quickSuggestions: dedupeStrings(quickSuggestions, 8),
              searchOptions: dedupeStrings(searchOptions, 12),
              scopeReady: true,
            };
          } catch {
            return {
              ...current,
              quickSuggestions: [],
              searchOptions: [],
              scopeReady: true,
            };
          }
        }),
      );
      if (!cancelled) setUi(nextUi);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [rows, ui.map((entry) => entry.inputValue).join("|")]);

  const selectedCategoryValues = React.useMemo(
    () =>
      rows.map((row) => normalizeText(row.value ?? "").toLowerCase()).filter(Boolean),
    [rows],
  );

  const setRowCategory = React.useCallback(
    async (index: number, nextCategoryRaw: string) => {
      const nextCategory = normalizeText(nextCategoryRaw);
      const currentRows = rowsRef.current;
      const duplicateElsewhere = currentRows.some(
        (row, rowIndex) =>
          rowIndex !== index &&
          normalizeText(row.value ?? "").toLowerCase() === nextCategory.toLowerCase() &&
          nextCategory,
      );

      if (duplicateElsewhere) {
        // Ignore duplicate selection attempts and keep current row unchanged.
        return;
      }

      let nextRows = currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, value: nextCategory } : row,
      );

      if (!nextCategory) {
        nextRows = nextRows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, subcategories: [] } : row,
        );
        setValue(finalizeRows(nextRows) as any);
        return;
      }

      // Commit category selection immediately so stale async work cannot revert rows.
      setValue(finalizeRows(nextRows) as any);

      try {
        const allowed = new Set(
          (await loadSubcategoryOptions([nextCategory], "")).map((entry) =>
            entry.toLowerCase(),
          ),
        );

        const latestRows = finalizeRows(rowsRef.current);
        const latestRowValue = normalizeText(latestRows[index]?.value ?? "");
        if (latestRowValue.toLowerCase() !== nextCategory.toLowerCase()) {
          return;
        }

        const filteredRows = latestRows.map((row, rowIndex) => {
          if (rowIndex !== index) return row;
          const filtered = normalizeSubRows(row.subcategories).filter((sub) =>
            allowed.has(normalizeText(sub.value ?? "").toLowerCase()),
          );
          return { ...row, value: nextCategory, subcategories: filtered };
        });
        setValue(finalizeRows(filteredRows) as any);
      } catch {
        // keep existing subcategories if scope load fails
      }
    },
    [setValue],
  );

  const setRowInput = React.useCallback((index: number, inputValue: string) => {
    setUi((prev) =>
      prev.map((entry, rowIndex) =>
        rowIndex === index ? { ...entry, inputValue } : entry,
      ),
    );
  }, []);

  const setRowSubcategories = React.useCallback((index: number, nextValues: string[]) => {
    const next = finalizeRows(
      rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              subcategories: dedupeStrings(nextValues).map((value) => ({ value })),
            }
          : row,
      ),
    );
    setValue(next as any);
  }, [rows, setValue]);

  const addSubcategory = React.useCallback(
    (index: number, raw: string) => {
      const value = normalizeText(raw);
      if (!value) return;
      const current = normalizeSubRows(rows[index]?.subcategories).map((sub) => sub.value ?? "");
      setRowSubcategories(index, [...current, value]);
      setRowInput(index, "");
    },
    [rows, setRowInput, setRowSubcategories],
  );

  const removeSubcategory = React.useCallback(
    (index: number, subIndex: number) => {
      const current = normalizeSubRows(rows[index]?.subcategories).map((sub) => sub.value ?? "");
      setRowSubcategories(
        index,
        current.filter((_, idx) => idx !== subIndex),
      );
    },
    [rows, setRowSubcategories],
  );

  const getAvailableCategoriesForIndex = React.useCallback(
    (index: number) =>
      categoryOptions.filter((option) => {
        const selectedElsewhere = rows.some(
          (row, rowIndex) =>
            rowIndex !== index &&
            normalizeText(row.value ?? "").toLowerCase() === option.value.toLowerCase(),
        );
        return !selectedElsewhere;
      }),
    [categoryOptions, rows],
  );

  return (
    <div className={B}>
      <label className={`${B}__label`}>{label}</label>
      {errorMessage ? <p className={`${B}__error`}>{errorMessage}.</p> : null}

      {rows.map((row, index) => {
        const selectedCategory = normalizeText(row.value ?? "");
        const subcategories = normalizeSubRows(row.subcategories);
        const rowUi = ui[index] ?? makeEmptyUiState()[0];
        const quickSuggestions = rowUi.quickSuggestions.filter(
          (suggestion) =>
            !subcategories.some(
              (sub) =>
                normalizeText(sub.value ?? "").toLowerCase() === suggestion.toLowerCase(),
            ),
        );
        const emptyScopeHintVisible =
          Boolean(selectedCategory) &&
          rowUi.scopeReady &&
          quickSuggestions.length === 0 &&
          subcategories.length === 0;

        return (
          <div
            key={row.id ?? `category-row-${index}`}
            style={{
              border: "1px solid var(--theme-elevation-100)",
              borderRadius: 8,
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              {`Category ${String(index + 1).padStart(2, "0")}`}
            </div>

            <label htmlFor={`${path}-${index}-value`} className={`${B}__label`}>
              Value
            </label>
            <select
              id={`${path}-${index}-value`}
              className={`${B}__control`}
              value={selectedCategory}
              onChange={(event) => void setRowCategory(index, event.target.value)}
            >
              <option value="">Add Category</option>
              {getAvailableCategoriesForIndex(index).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className={`${B}__hint`}>
              Select from the category tree synced from category-service.
            </p>

            <label
              htmlFor={`${path}-${index}-subcategories`}
              className={`${B}__label`}
              style={{ marginTop: "0.85rem" }}
            >
              Subcategories
            </label>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "0.4rem" }}>
              {subcategories.map((sub, subIndex) => (
                <span
                  key={`${sub.id ?? sub.value}-${subIndex}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--theme-elevation-50)",
                    border: "1px solid var(--theme-elevation-150)",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 12,
                    lineHeight: "16px",
                  }}
                >
                  {sub.value}
                  <button
                    type="button"
                    onClick={() => removeSubcategory(index, subIndex)}
                    aria-label={`Remove ${sub.value}`}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      opacity: 0.65,
                      fontSize: 14,
                      lineHeight: "14px",
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <input
              id={`${path}-${index}-subcategories`}
              type="text"
              list={`${path}-${index}-subcategories-options`}
              className={`${B}__control`}
              disabled={!selectedCategory}
              placeholder={selectedCategory ? "Add Subcategory" : "Pick a category first"}
              value={rowUi.inputValue}
              onChange={(event) => setRowInput(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addSubcategory(index, rowUi.inputValue);
                }
              }}
              onBlur={() => addSubcategory(index, rowUi.inputValue)}
            />
            <datalist id={`${path}-${index}-subcategories-options`}>
              {rowUi.searchOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>

            {selectedCategory && quickSuggestions.length ? (
              <>
                <p className={`${B}__quickAddLabel`}>Suggested subcategories</p>
                <div className={`${B}__quickAddWrap`}>
                  {quickSuggestions.map((suggestion) => (
                    <button
                      key={`${selectedCategory}:${suggestion}`}
                      type="button"
                      className={`${B}__quickAddBtn`}
                      onClick={() => addSubcategory(index, suggestion)}
                    >
                      <span>{suggestion}</span>
                      <strong aria-hidden="true">+</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {emptyScopeHintVisible ? (
              <p className={`${B}__error`}>
                This selected category does not expose subcategories in the category tree.
              </p>
            ) : null}

            <p className={`${B}__hint`}>
              {selectedCategory
                ? `Add up to ${MAX_SUBCATEGORIES} subcategories for "${selectedCategory}".`
                : "Pick a category for this row first to get scoped subcategory suggestions."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
