import React from "react";
import { useField } from "payload/components/forms";

import { loadSubcategoryOptions } from "./categoryOptions";

import "./CategoryFields.scss";

const B = "marketeq-categoryField";

const SubcategoryAutocompleteField: React.FC<{ path: string; label?: string }> = ({
  path,
  label = "Subcategory",
}) => {
  const { value, setValue } = useField<string>({ path });
  const { value: selectedCategoriesValue } = useField<
    Array<{ value?: string }> | undefined
  >({ path: "categories" });

  const rowIndex = React.useMemo(() => {
    const match = path.match(/^categories\.(\d+)\.subcategories\./);
    return match ? Number(match[1]) : null;
  }, [path]);

  const [inputValue, setInputValue] = React.useState<string>(value ?? "");
  const [options, setOptions] = React.useState<string[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const selectedCategory = React.useMemo(() => {
    if (rowIndex == null || !Array.isArray(selectedCategoriesValue)) {
      return "";
    }

    const valueAtRow = selectedCategoriesValue[rowIndex]?.value;
    return typeof valueAtRow === "string" ? valueAtRow.trim() : "";
  }, [rowIndex, selectedCategoriesValue]);

  const selectedCategories = React.useMemo(
    () => (selectedCategory ? [selectedCategory] : []),
    [selectedCategory],
  );

  React.useEffect(() => {
    setInputValue(typeof value === "string" ? value : "");
  }, [value]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!selectedCategories.length) {
        setOptions([]);
        setErrorMessage(null);
        return;
      }

      try {
        const loadedOptions = await loadSubcategoryOptions(
          selectedCategories,
          inputValue,
        );

        if (!cancelled) {
          setOptions(loadedOptions);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load subcategory suggestions";
          setErrorMessage(message);
        }
      }
    };

    const timer = setTimeout(() => {
      void run();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue, selectedCategories]);

  const helperText = selectedCategory
    ? `Suggestions are scoped to "${selectedCategory}" (publish-project parity).`
    : "Pick a category for this row first to get scoped subcategory suggestions.";

  return React.createElement(
    "div",
    { className: B },
    React.createElement(
      "label",
      { htmlFor: path, className: `${B}__label` },
      label,
    ),
    React.createElement("input", {
      id: path,
      type: "text",
      list: `${path}-options`,
      value: inputValue,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = event.target.value;
        setInputValue(nextValue);
        setValue(nextValue);
      },
      placeholder: "Add Subcategory",
      className: `${B}__control`,
    }),
    React.createElement(
      "datalist",
      { id: `${path}-options` },
      ...options.map((option) =>
        React.createElement("option", { key: option, value: option }),
      ),
    ),
    errorMessage
      ? React.createElement(
          "p",
          { className: `${B}__error` },
          `${errorMessage}.`,
        )
      : React.createElement("p", { className: `${B}__hint` }, helperText),
  );
};

export default SubcategoryAutocompleteField;
