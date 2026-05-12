import React from "react";
import { useField } from "payload/components/forms";

import {
  loadAutocompleteOptions,
  submitAutocompleteEntry,
} from "./autocompleteOptions";

import "./CategoryFields.scss";

const B = "marketeq-categoryField";

type FieldProps = {
  path: string;
  label?: string;
  field?: {
    admin?: {
      description?: string;
    };
    custom?: {
      targetPath?: string;
      label?: string;
      description?: string;
      autocompleteType?: string;
      submitType?: string;
      submitSource?: string;
      placeholder?: string;
      suggestedOptions?: string[];
      renderAsSelect?: boolean;
    };
  };
};

type FallbackConfig = {
  autocompleteType: string;
  submitType: string;
  placeholder: string;
  suggestedOptions: string[];
};

function getFallbackConfigFromPath(path: string): FallbackConfig | null {
  if (path === "headline") {
    return {
      autocompleteType: "job_titles",
      submitType: "title",
      placeholder: "Add professional headline",
      suggestedOptions: [
        "Frontend Developer",
        "Backend Engineer",
        "Product Designer",
        "Data Analyst",
      ],
    };
  }

  if (path === "location") {
    return {
      autocompleteType: "location",
      submitType: "location",
      placeholder: "Add city or region",
      suggestedOptions: ["New York", "San Francisco", "London", "Berlin", "Toronto"],
    };
  }

  if (path === "country") {
    return {
      autocompleteType: "location",
      submitType: "location",
      placeholder: "Add country",
      suggestedOptions: [
        "United States",
        "United Kingdom",
        "Canada",
        "Germany",
        "India",
      ],
    };
  }

  if (/^languages\.\d+\.language$/.test(path)) {
    return {
      autocompleteType: "languages",
      submitType: "language",
      placeholder: "Add language",
      suggestedOptions: ["English", "Spanish", "French", "German", "Hindi"],
    };
  }

  if (/^certifications\.\d+\.title$/.test(path)) {
    return {
      autocompleteType: "certifications",
      submitType: "certification",
      placeholder: "Add certification title",
      suggestedOptions: [
        "AWS Certified Developer",
        "Google Cloud Associate Engineer",
        "PMP",
      ],
    };
  }

  return null;
}

const TextAutocompleteField: React.FC<FieldProps> = ({ path, label, field }) => {
  const targetPath =
    field?.custom?.targetPath && path.includes(".")
      ? `${path.split(".").slice(0, -1).join(".")}.${field.custom.targetPath}`
      : field?.custom?.targetPath ?? path;

  const { value, setValue, showError, errorMessage } = useField<string>({
    path: targetPath,
  });
  const [inputValue, setInputValue] = React.useState(value ?? "");
  const [options, setOptions] = React.useState<string[]>([]);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fallback = React.useMemo(() => getFallbackConfigFromPath(path), [path]);
  const autocompleteType =
    field?.custom?.autocompleteType ?? fallback?.autocompleteType ?? "";
  const submitType = field?.custom?.submitType ?? fallback?.submitType ?? "";
  const submitSource = field?.custom?.submitSource ?? "cms-service:talent-profiles";
  const placeholder =
    field?.custom?.placeholder ?? fallback?.placeholder ?? "Start typing...";
  const suggestedOptions = Array.isArray(field?.custom?.suggestedOptions)
    ? field!.custom!.suggestedOptions!
    : fallback?.suggestedOptions ?? [];
  const renderAsSelect = field?.custom?.renderAsSelect === true;

  React.useEffect(() => {
    setInputValue(typeof value === "string" ? value : "");
  }, [value]);

  React.useEffect(() => {
    let cancelled = false;
    if (!autocompleteType) return;
    const run = async () => {
      try {
        const loaded = await loadAutocompleteOptions(autocompleteType, inputValue);
        if (!cancelled) {
          setOptions(loaded.slice(0, 12));
          setFetchError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Failed to load suggestions");
        }
      }
    };
    const t = setTimeout(() => void run(), 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [autocompleteType, inputValue]);

  const commitValue = React.useCallback(
    (nextRaw: string) => {
      const next = nextRaw.trim();
      setInputValue(nextRaw);
      setValue(nextRaw);
      if (!next || !submitType) return;
      void submitAutocompleteEntry({
        type: submitType,
        value: next,
        source: submitSource,
      }).catch(() => {
        // Best-effort submit only; do not block editor input.
      });
    },
    [setValue, submitSource, submitType],
  );

  const filteredSuggested = React.useMemo(() => {
    const current = inputValue.trim().toLowerCase();
    return suggestedOptions
      .filter((item) => item && item.toLowerCase() !== current)
      .slice(0, 5);
  }, [inputValue, suggestedOptions]);

  const datalistOptions = React.useMemo(() => {
    const merged = [...options, ...suggestedOptions];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of merged) {
      const normalized = (item || "").trim();
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
    }
    return out.slice(0, 100);
  }, [options, suggestedOptions]);

  if (renderAsSelect) {
    const filteredSelectOptions = datalistOptions.filter((item) =>
      item.toLowerCase().includes(inputValue.trim().toLowerCase()),
    );

    return React.createElement(
      "div",
      { className: B },
      React.createElement(
        "label",
        { htmlFor: `${path}-search`, className: `${B}__label` },
        field?.custom?.label ?? label ?? path.split(".").slice(-1)[0],
      ),
      React.createElement("input", {
        id: `${path}-search`,
        type: "text",
        value: inputValue,
        placeholder,
        className: `${B}__control`,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const next = event.target.value;
          setInputValue(next);
          setValue(next);
        },
      }),
      React.createElement(
        "select",
        {
          id: path,
          className: `${B}__control`,
          value: inputValue,
          "aria-invalid": showError ? "true" : undefined,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            commitValue(event.target.value),
        },
        React.createElement("option", { value: "" }, "Select timezone"),
        ...filteredSelectOptions.map((option) =>
          React.createElement("option", { key: option, value: option }, option),
        ),
      ),
      (field?.custom?.description || field?.admin?.description)
        ? React.createElement(
            "p",
            { className: `${B}__hint` },
            field?.custom?.description || field?.admin?.description,
          )
        : null,
      showError && errorMessage
        ? React.createElement("p", { className: `${B}__error` }, errorMessage)
        : null,
    );
  }

  return React.createElement(
    "div",
    { className: B },
    React.createElement(
      "label",
      { htmlFor: path, className: `${B}__label` },
      field?.custom?.label ?? label ?? path.split(".").slice(-1)[0],
    ),
    React.createElement("input", {
      id: path,
      type: "text",
      list: `${path}-options`,
      value: inputValue,
      placeholder,
      className: `${B}__control`,
      "aria-invalid": showError ? "true" : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        setInputValue(next);
        setValue(next);
      },
      onBlur: () => commitValue(inputValue),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitValue(inputValue);
        }
      },
    }),
    React.createElement(
      "datalist",
      { id: `${path}-options` },
      ...datalistOptions.map((option) =>
        React.createElement("option", { key: option, value: option }),
      ),
    ),
    (field?.custom?.description || field?.admin?.description)
      ? React.createElement(
          "p",
          { className: `${B}__hint` },
          field?.custom?.description || field?.admin?.description,
        )
      : null,
    filteredSuggested.length > 0
      ? React.createElement(
          "div",
          null,
          React.createElement(
            "p",
            { className: `${B}__suggestedLabel` },
            "Suggested",
          ),
          React.createElement(
            "div",
            { className: `${B}__suggestedWrap` },
            ...filteredSuggested.map((item) =>
              React.createElement(
                "button",
                {
                  key: item,
                  type: "button",
                  className: `${B}__suggestedBtn`,
                  onClick: () => commitValue(item),
                },
                item,
              ),
            ),
          ),
        )
      : null,
    fetchError
      ? React.createElement("p", { className: `${B}__error` }, `${fetchError}.`)
      : null,
    showError && errorMessage
      ? React.createElement("p", { className: `${B}__error` }, errorMessage)
      : null,
  );
};

export default TextAutocompleteField;
