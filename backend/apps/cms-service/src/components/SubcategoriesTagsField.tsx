import React from "react";
import { useField } from "payload/components/forms";
import { useDocumentInfo } from "payload/components/utilities";
import { loadSubcategoryOptions } from "./categoryOptions";

import "./CategoryFields.scss";

const B = "marketeq-categoryField";

type SubcategoryRow = { value?: string };

function normalizeTag(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getValueAtPath(doc: unknown, path: string): unknown {
  if (!doc || typeof doc !== "object") return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: any = doc;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isFinite(idx)) return undefined;
      cur = cur[idx];
      continue;
    }
    cur = cur[p];
  }
  return cur;
}

function normalizeRows(raw: unknown): SubcategoryRow[] {
  let rowsRaw: unknown = raw;
  // Be permissive: Payload admin form state for arrays can vary by mount point.
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
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const v = (r as any).value;
      return typeof v === "string" && v.trim()
        ? ({ value: v.trim() } as SubcategoryRow)
        : null;
    })
    .filter((r): r is SubcategoryRow => r !== null);
}

export default function SubcategoriesTagsField({
  path,
  label = "Subcategories",
}: {
  path: string;
  label?: string;
}) {
  const subcategoriesFieldPath = React.useMemo(() => {
    // Custom Field on an `array` field: Payload sometimes passes a path to a child
    // (`categories.0.subcategories.0.value`) or a pseudo leaf (`...subcategories.value`).
    // `useField` must always target the array field path so existing DB rows hydrate correctly.
    const m = path.match(/^(.*\.subcategories)(?:\.|$)/);
    return m ? m[1] : path;
  }, [path]);

  const { value: rows, setValue: setRows } = useField<SubcategoryRow[]>({
    path: subcategoriesFieldPath,
  });

  const categoryValuePath = React.useMemo(() => {
    // Payload may pass paths like:
    // - categories.0.subcategories
    // - categories.0.subcategories.value
    // We want the sibling category select field at categories.0.value.
    return subcategoriesFieldPath.replace(/\.subcategories$/, ".value");
  }, [subcategoriesFieldPath]);

  const { value: selectedCategoryValue } = useField<string>({ path: categoryValuePath });

  const selectedCategoryResolved = React.useMemo(() => {
    const v = selectedCategoryValue;
    return typeof v === "string" ? v.trim() : "";
  }, [selectedCategoryValue]);

  const docInfo = useDocumentInfo();

  const tags = React.useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((r) => (typeof r?.value === "string" ? normalizeTag(r.value) : ""))
      .filter(Boolean);
  }, [rows]);

  const tagsLower = React.useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags],
  );

  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState<string[]>([]);
  const [quickSuggestions, setQuickSuggestions] = React.useState<string[]>([]);
  const [subcategoryScopeReady, setSubcategoryScopeReady] = React.useState(false);

  // Best-effort hydration: if nested array values don't hydrate in Payload admin for custom
  // Field overrides, pull persisted value via REST once (does not overwrite non-empty state).
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (Array.isArray(rows) && rows.length > 0) return;

        const id = (docInfo as any)?.id ?? (docInfo as any)?.docID ?? null;
        if (!id) return;

        const pathName = typeof window !== "undefined" ? window.location.pathname : "";
        const match = pathName.match(/\/admin\/collections\/([^/]+)\/([^/]+)/);
        const collection = match?.[1];
        if (!collection) return;

        const res = await fetch(
          `/api/${collection}/${encodeURIComponent(String(id))}?depth=0`,
        );
        if (!res.ok) return;
        const doc = (await res.json()) as any;
        const nextVal = getValueAtPath(doc, subcategoriesFieldPath);
        const parsed = normalizeRows(nextVal);
        if (!cancelled && parsed.length > 0) {
          setRows(parsed);
        }
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [docInfo, rows, setRows, subcategoriesFieldPath]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedCategoryResolved) {
        setOptions([]);
        return;
      }
      try {
        const next = await loadSubcategoryOptions([selectedCategoryResolved], inputValue);
        if (!cancelled) setOptions(next);
      } catch {
        if (!cancelled) setOptions([]);
      }
    };
    const timer = setTimeout(() => void run(), 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCategoryResolved, inputValue]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedCategoryResolved) {
        setQuickSuggestions([]);
        setSubcategoryScopeReady(false);
        return;
      }

      try {
        setSubcategoryScopeReady(false);
        const base = await loadSubcategoryOptions([selectedCategoryResolved], "");
        const next = cancelled ? [] : base;
        const dedup = Array.from(new Set(next.map((v) => normalizeTag(v)).filter(Boolean)));
        dedup.sort((a, b) => a.localeCompare(b));
        if (!cancelled) {
          setQuickSuggestions(dedup.slice(0, 8));
          setSubcategoryScopeReady(true);
        }
      } catch {
        if (!cancelled) {
          setQuickSuggestions([]);
          setSubcategoryScopeReady(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryResolved]);

  const setTags = React.useCallback(
    (nextTags: string[]) => {
      const normalized = nextTags
        .map(normalizeTag)
        .filter(Boolean)
        .filter(
          (v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
        )
        .slice(0, 5);
      setRows(normalized.map((value) => ({ value })));
    },
    [setRows],
  );

  const addTag = React.useCallback(() => {
    const next = normalizeTag(inputValue);
    if (!next) return;
    setTags([...tags, next]);
    setInputValue("");
  }, [inputValue, setTags, tags]);

  const addSuggestionTag = React.useCallback(
    (raw: string) => {
      const next = normalizeTag(raw);
      if (!next || tagsLower.has(next.toLowerCase())) return;
      setTags([...tags, next]);
    },
    [setTags, tags, tagsLower],
  );

  const removeTag = React.useCallback(
    (idx: number) => {
      setTags(tags.filter((_, i) => i !== idx));
    },
    [setTags, tags],
  );

  const quickAddVisible = React.useMemo(() => {
    return quickSuggestions.filter((s) => !tagsLower.has(normalizeTag(s).toLowerCase())).slice(0, 8);
  }, [quickSuggestions, tagsLower]);

  const emptyScopeHintVisible =
    Boolean(selectedCategoryResolved) &&
    subcategoryScopeReady &&
    quickSuggestions.length === 0 &&
    tags.length === 0;

  return (
    <div className={B}>
      <label htmlFor={`${path}__input`} className={`${B}__label`}>
        {label}
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {tags.map((t, idx) => (
          <span
            key={`${t}-${idx}`}
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
            {t}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              aria-label={`Remove ${t}`}
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
        id={`${subcategoriesFieldPath}__input`}
        type="text"
        list={`${subcategoriesFieldPath}-options`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={() => addTag()}
        disabled={!selectedCategoryResolved}
        placeholder={selectedCategoryResolved ? "Add Subcategory" : "Pick a category first"}
        className={`${B}__control`}
      />

      <datalist id={`${subcategoriesFieldPath}-options`}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>

      {selectedCategoryResolved && quickAddVisible.length ? (
        <>
          <p className={`${B}__quickAddLabel`}>Suggested subcategories</p>
          <div className={`${B}__quickAddWrap`}>
            {quickAddVisible.map((suggestion) => (
              <button
                key={`${selectedCategoryResolved}:${suggestion}`}
                type="button"
                className={`${B}__quickAddBtn`}
                onClick={() => addSuggestionTag(suggestion)}
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
          This selected category does not expose subcategories in the category tree (often because
          this value is itself a leaf). Pick the parent bucket (for example Content), then choose
          subcategories such as Blog Writing.
        </p>
      ) : null}

      <p className={`${B}__hint`}>
        {selectedCategoryResolved
          ? `Add up to 5 subcategories for "${selectedCategoryResolved}".`
          : "Pick a category for this row first to get scoped subcategory suggestions."}
      </p>
    </div>
  );
}

