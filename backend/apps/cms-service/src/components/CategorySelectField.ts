import React from "react";
import { useField } from "payload/components/forms";
import {
  loadCategoryOptions,
  loadSuggestedCategoryOptions,
  loadSubcategoryOptions,
  type CategoryOption,
  type SuggestedCategoryOption,
} from "./categoryOptions";

import "./CategoryFields.scss";

const B = "marketeq-categoryField";

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
  const [suggested, setSuggested] = React.useState<SuggestedCategoryOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const rowIndex = React.useMemo(() => {
    const match = path.match(/^categories\.(\d+)\.value$/);
    return match ? Number(match[1]) : null;
  }, [path]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const [loadedOptions, loadedSuggested] = await Promise.all([
          loadCategoryOptions(),
          loadSuggestedCategoryOptions(),
        ]);
        if (!cancelled) {
          setOptions(loadedOptions);
          setSuggested(loadedSuggested);
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

  const currentValue = typeof value === "string" ? value : "";
  const hasCurrentValue =
    currentValue && !options.some((option) => option.value === currentValue);

  const selectedCategoryValues = React.useMemo(
    () =>
      (Array.isArray(categoriesValue) ? categoriesValue : [])
        .map((entry, index) =>
          index === rowIndex ? "" : (entry?.value || "").trim(),
        )
        .filter(Boolean),
    [categoriesValue, rowIndex],
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

  const selectedSuggestedPairs = React.useMemo(
    () =>
      new Set(
        (Array.isArray(categoriesValue) ? categoriesValue : [])
          .flatMap((entry) => {
            const category =
              typeof entry?.value === "string" ? entry.value.trim() : "";

            if (!category || !Array.isArray(entry?.subcategories)) {
              return [];
            }

            return entry.subcategories
              .map((subEntry) => {
                const subCategory =
                  typeof subEntry?.value === "string"
                    ? subEntry.value.trim()
                    : "";
                return subCategory
                  ? `${category.toLowerCase()}::${subCategory.toLowerCase()}`
                  : "";
              })
              .filter(Boolean);
          }),
      ),
    [categoriesValue],
  );

  const suggestedForDisplay = React.useMemo(
    () =>
      suggested
        .filter(
          (entry) =>
            !selectedSuggestedPairs.has(
              `${entry.category.toLowerCase()}::${entry.subCategory.toLowerCase()}`,
            ),
        )
        .slice(0, 4),
    [suggested, selectedSuggestedPairs],
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
    setValue(nextValue);

    if (rowIndex == null || !Array.isArray(categoriesValue)) {
      return;
    }

    const nextCategories = [...categoriesValue];
    const currentRow =
      nextCategories[rowIndex] ?? ({ value: "", subcategories: [] } as {
        value?: string;
        subcategories?: Array<{ value?: string }>;
      });

    const currentSubcategories = Array.isArray(currentRow.subcategories)
      ? currentRow.subcategories
      : [];

    if (!nextValue.trim()) {
      if (currentSubcategories.length) {
        nextCategories[rowIndex] = {
          ...currentRow,
          value: nextValue,
          subcategories: [],
        };
        setCategoriesValue(nextCategories);
      }
      return;
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

  const applySuggestedPair = async (suggestedPair: SuggestedCategoryOption) => {
    if (rowIndex == null || !Array.isArray(categoriesValue)) {
      return;
    }

    setValue(suggestedPair.category);

    const nextCategories = [...categoriesValue];
    const currentRow =
      nextCategories[rowIndex] ?? ({ value: "", subcategories: [] } as {
        value?: string;
        subcategories?: Array<{ value?: string }>;
      });

    const fallbackSubcategory = suggestedPair.subCategory.trim();

    let selectedSubcategory = fallbackSubcategory;

    try {
      const allowedSubcategories = new Set(
        (await loadSubcategoryOptions([suggestedPair.category], "")).map((entry) =>
          entry.toLowerCase(),
        ),
      );

      if (!allowedSubcategories.has(fallbackSubcategory.toLowerCase())) {
        const [firstAllowed] = Array.from(allowedSubcategories);
        if (firstAllowed) {
          selectedSubcategory = firstAllowed;
        }
      }
    } catch {
      // If lookup fails, still apply the suggested pair to keep UX responsive.
    }

    nextCategories[rowIndex] = {
      ...currentRow,
      value: suggestedPair.category,
      subcategories: [{ value: selectedSubcategory }],
    };

    setCategoriesValue(nextCategories);
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
      hasCurrentValue
        ? React.createElement(
            "option",
            { value: currentValue },
            `${currentValue} (current value)`,
          )
        : null,
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
          suggestedForDisplay.length
            ? React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  "p",
                  { className: `${B}__suggestedLabel` },
                  "Suggested Categories",
                ),
                React.createElement(
                  "div",
                  { className: `${B}__suggestedWrap` },
                  ...suggestedForDisplay.map((entry) =>
                    React.createElement(
                      "button",
                      {
                        key: `${entry.category}:${entry.subCategory}`,
                        type: "button",
                        className: `${B}__suggestedBtn`,
                        onClick: () => {
                          void applySuggestedPair(entry);
                        },
                      },
                      `${entry.category} -> ${entry.subCategory}`,
                    ),
                  ),
                ),
              )
            : null,
        ),
  );
};

export default CategorySelectField;
