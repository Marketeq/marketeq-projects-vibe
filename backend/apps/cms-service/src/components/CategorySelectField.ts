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

type CategoryRow = {
  id?: string;
  value?: string;
  subcategories?: Array<{ id?: string; value?: string }>;
};

function normalizeCategoryRows(raw: unknown): CategoryRow[] {
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
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const id = typeof (r as any).id === "string" ? ((r as any).id as string) : undefined;
      const v = (r as any).value;
      const value = typeof v === "string" && v.trim() ? v.trim() : "";
      if (!value) return null;
      const subsRaw = (r as any).subcategories;
      const subcategories = Array.isArray(subsRaw)
        ? subsRaw
            .map((s: any) => {
              const sv = typeof s?.value === "string" ? s.value.trim() : "";
              if (!sv) return null;
              const sid = typeof s?.id === "string" ? (s.id as string) : undefined;
              return sid ? ({ id: sid, value: sv } as { id: string; value: string }) : ({ value: sv } as { value: string });
            })
            .filter(Boolean)
        : [];
      return id ? ({ id, value, subcategories } as CategoryRow) : ({ value, subcategories } as CategoryRow);
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

function dedupeCategoryRows(
  rows: CategoryRow[],
): CategoryRow[] {
  const seen = new Set<string>();
  let changed = false;
  const out = rows.map((r) => {
    const v = typeof r?.value === "string" ? r.value.trim() : "";
    const key = v.toLowerCase();
    if (!v) return r;
    if (seen.has(key)) {
      changed = true;
      return { ...r, value: "", subcategories: [] };
    }
    seen.add(key);
    return r;
  });
  return changed ? out : rows;
}

function rowsKey(rows: CategoryRow[]): string {
  return rows
    .map((r) => {
      const v = (r.value ?? "").trim().toLowerCase();
      const subs = Array.isArray(r.subcategories)
        ? r.subcategories
            .map((s) => (s?.value ?? "").trim().toLowerCase())
            .filter(Boolean)
            .join(",")
        : "";
      return `${v}::${subs}`;
    })
    .join("|");
}

const CategorySelectField: React.FC<{ path: string; label?: string }> = ({
  path,
  label = "Category",
}) => {
  const { value, setValue } = useField<string>({ path });
  const { value: categoriesValue, setValue: setCategoriesValue } = useField<
    Array<{
      value?: string;
      subcategories?: Array<{ value?: string }>;
    }> | undefined
  >({ path: "categories" });
  const [options, setOptions] = React.useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const docInfo = useDocumentInfo();

  const rowIndex = React.useMemo(() => {
    const match = path.match(/^categories\.(\d+)\.value$/);
    return match ? Number(match[1]) : null;
  }, [path]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const loadedOptions = await loadCategoryOptions();
        if (!cancelled) {
          setOptions(loadedOptions);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load categories";
          setErrorMessage(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  // Best-effort hydration: ensure `categories` array exists in form state so we can
  // reliably filter out already-selected categories across the 3 rows.
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const hasRows = Array.isArray(categoriesValue) && categoriesValue.length > 0;
        if (hasRows) return;

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
        const persisted = normalizeCategoryRows(doc?.categories);
        if (!cancelled && persisted.length > 0) {
          setCategoriesValue(dedupeCategoryRows(persisted) as any);
        }
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [categoriesValue, docInfo, setCategoriesValue]);

  const normalizedCategories = React.useMemo(
    () => normalizeCategoryRows(categoriesValue),
    [categoriesValue],
  );

  // The `<select>` is bound to `categories.N.value`, but we also keep a parent `categories`
  // array in form state for cross-row filtering. If we dedupe/normalize the parent array,
  // ensure this row's bound field stays in sync (so duplicates visually clear).
  React.useEffect(() => {
    if (rowIndex == null) return;
    // Important: don't sync until the parent `categories` array has actually hydrated.
    // Otherwise we may temporarily derive an empty parent row value and clear the select,
    // which in turn disables/empties the subcategory field.
    if (normalizedCategories.length <= rowIndex) return;
    const parentRowValue =
      typeof normalizedCategories[rowIndex]?.value === "string"
        ? normalizedCategories[rowIndex]!.value!.trim()
        : "";
    const fieldValue = typeof value === "string" ? value.trim() : "";
    if (parentRowValue !== fieldValue) {
      setValue(parentRowValue);
    }
  }, [normalizedCategories, rowIndex, setValue, value]);

  // If Payload gives a non-array/odd shape for `categories`, normalize it so row-to-row
  // filtering (publish-project style) always works.
  React.useEffect(() => {
    if (!normalizedCategories.length) return;
    const currentKey = rowsKey(normalizeCategoryRows(categoriesValue));
    const nextKey = rowsKey(normalizedCategories);
    if (currentKey && currentKey !== nextKey) {
      setCategoriesValue(dedupeCategoryRows(normalizedCategories) as any);
    }
  }, [categoriesValue, normalizedCategories, setCategoriesValue]);

  // If a doc (seeded/legacy) already has duplicates, clear duplicates automatically
  // so editors can't end up with the same category selected multiple times.
  React.useEffect(() => {
    if (normalizedCategories.length < 2) return;
    const next = dedupeCategoryRows(normalizedCategories);
    if (rowsKey(next) !== rowsKey(normalizedCategories)) {
      setCategoriesValue(next as any);
    }
  }, [normalizedCategories, setCategoriesValue]);

  const currentValue = typeof value === "string" ? value : "";

  const selectedCategoryValues = React.useMemo(
    () =>
      normalizedCategories
        .map((entry, index) =>
          index === rowIndex ? "" : (entry?.value || "").trim(),
        )
        .filter(Boolean),
    [normalizedCategories, rowIndex],
  );

  const availableOptions = React.useMemo(
    () =>
      options.filter(
        (option) =>
          option.value === currentValue ||
          !selectedCategoryValues.includes(option.value),
      ),
    [options, currentValue, selectedCategoryValues],
  );

  const renderCategoryLabel = (option: CategoryOption): string => {
    const prefix = option.depth > 0 ? `${"-- ".repeat(option.depth)}` : "";
    const pathLabel = option.path.join(" > ");

    if (option.depth > 0) {
      return `${prefix}${option.label} (${pathLabel})`;
    }

    return `${prefix}${option.label}`;
  };

  const handleCategoryChange = async (nextValue: string) => {
    // Enforce uniqueness: block selecting a category already used in other rows.
    const trimmedNext = nextValue.trim();
    const isDuplicate =
      trimmedNext &&
      selectedCategoryValues.some((v) => v.toLowerCase() === trimmedNext.toLowerCase());

    if (isDuplicate) {
      // Clear this row rather than allowing duplicates.
      setValue("");
      if (rowIndex != null) {
        const nextCategories = [...normalizedCategories];
        const currentRow =
          nextCategories[rowIndex] ?? ({ value: "", subcategories: [] } as {
            value?: string;
            subcategories?: Array<{ value?: string }>;
          });
        nextCategories[rowIndex] = { ...currentRow, value: "", subcategories: [] };
        setCategoriesValue(nextCategories);
      }
      return;
    }

    setValue(nextValue);

    if (rowIndex == null) {
      return;
    }

    const nextCategories = [...normalizedCategories];
    const currentRow =
      nextCategories[rowIndex] ?? ({ value: "", subcategories: [] } as {
        value?: string;
        subcategories?: Array<{ value?: string }>;
      });

    const currentSubcategories = Array.isArray(currentRow.subcategories)
      ? currentRow.subcategories
      : [];

    if (!nextValue.trim()) {
      nextCategories[rowIndex] = {
        ...currentRow,
        value: nextValue,
        subcategories: [],
      };
      setCategoriesValue(nextCategories);
      return;
    }

    // Keep parent `categories` form state in sync so other rows can filter out this selection.
    if ((currentRow.value ?? "").trim() !== nextValue.trim()) {
      nextCategories[rowIndex] = {
        ...currentRow,
        value: nextValue,
      };
      setCategoriesValue(dedupeCategoryRows(nextCategories) as any);
    }

    try {
      const allowedSubcategories = new Set(
        (await loadSubcategoryOptions([nextValue], "")).map((entry) =>
          entry.toLowerCase(),
        ),
      );

      const filteredSubcategories = currentSubcategories.filter((entry) => {
        const subcategoryValue =
          typeof entry?.value === "string" ? entry.value.trim() : "";
        if (!subcategoryValue) return false;

        return allowedSubcategories.has(subcategoryValue.toLowerCase());
      });

      if (filteredSubcategories.length !== currentSubcategories.length) {
        nextCategories[rowIndex] = {
          ...currentRow,
          value: nextValue,
          subcategories: filteredSubcategories,
        };
        setCategoriesValue(nextCategories);
      }
    } catch {
      // Keep current subcategories untouched when suggestion API is unavailable.
    }
  };

  return React.createElement(
    "div",
    { className: B },
    React.createElement(
      "label",
      { htmlFor: path, className: `${B}__label` },
      label,
    ),
    React.createElement(
      "select",
      {
        id: path,
        value: currentValue,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
          void handleCategoryChange(event.target.value);
        },
        className: `${B}__control`,
        disabled: isLoading && options.length === 0,
      },
      React.createElement(
        "option",
        { value: "" },
        isLoading && options.length === 0
          ? "Loading categories..."
          : "Add Category",
      ),
      ...availableOptions.map((option) =>
        React.createElement(
          "option",
          { key: option.value, value: option.value },
          renderCategoryLabel(option),
        ),
      ),
    ),
    errorMessage
      ? React.createElement(
          "p",
          { className: `${B}__error` },
          `${errorMessage}. Editors can still type a category name manually after a refresh.`,
        )
      : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "p",
            { className: `${B}__hint` },
            "Select from the category tree synced from category-service.",
          ),
        ),
  );
};

export default CategorySelectField;
