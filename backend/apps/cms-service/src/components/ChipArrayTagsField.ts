import React from "react";
import { useField } from "payload/components/forms";
import { useDocumentInfo } from "payload/components/utilities";

import {
  FALLBACK_INDUSTRY_OPTIONS,
  FALLBACK_SKILL_OPTIONS,
  FALLBACK_TAG_OPTIONS,
  loadAutocompleteOptions,
} from "./autocompleteOptions";

import "./ChipArrayTagsField.scss";

type ValueRow = { id?: string; value: string };

type FieldProps = {
  path: string;
  /** Payload often passes the field label for custom components. */
  label?: string;
  field?: {
    required?: boolean;
    maxRows?: number;
    labels?: { singular?: string; plural?: string };
  };
};

export type ChipArrayTagsFieldConfig = {
  /** Shown as the main heading (Payload may hide array labels when using a custom Field). */
  title: string;
  autocompleteType: string;
  placeholder: string;
  /** Shown under the count (publish-project style copy). */
  getHelperText: (maxRows: number) => string;
  defaultMaxRows: number;
  suggestedOptions: readonly string[];
  suggestedHeading: string;
  fetchErrorLabel: string;
  /**
   * Payload v2 often omits `field.required` on custom `Field` overrides for arrays.
   * Set true when the collection marks the field `required: true` so the title shows *.
   */
  forceShowRequired?: boolean;
};

const B = "marketeq-chipArray";

function normalizeValueRows(raw: unknown): ValueRow[] {
  let rowsRaw: unknown = raw;
  // Payload admin form state for array fields can vary depending on how the
  // Field override is mounted. Be permissive so existing seeded values render.
  if (!Array.isArray(rowsRaw) && rowsRaw && typeof rowsRaw === "object") {
    const anyRaw = rowsRaw as any;
    if (Array.isArray(anyRaw.rows)) rowsRaw = anyRaw.rows;
    else if (Array.isArray(anyRaw.value)) rowsRaw = anyRaw.value;
  }
  if (typeof rowsRaw === "string") {
    try {
      const parsed = JSON.parse(rowsRaw);
      rowsRaw = parsed;
    } catch {
      // ignore
    }
  }
  if (!Array.isArray(rowsRaw)) return [];
  const out: ValueRow[] = [];
  for (const row of rowsRaw) {
    if (!row || typeof row !== "object") continue;
    const v = (row as { value?: unknown }).value;
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const id = (row as { id?: string }).id;
    out.push(id ? { id, value: trimmed } : { value: trimmed });
  }
  return out;
}

function rowsToFormValue(rows: ValueRow[]): Array<{ id?: string; value: string }> {
  return rows.map((r) => (r.id ? { id: r.id, value: r.value } : { value: r.value }));
}

export function createChipArrayTagsField(
  config: ChipArrayTagsFieldConfig,
): React.FC<FieldProps> {
  const ChipArrayTagsFieldImpl: React.FC<FieldProps> = ({ path, field, label }) => {
    const maxRows =
      typeof field?.maxRows === "number" ? field.maxRows : config.defaultMaxRows;
    const displayTitle =
      (typeof label === "string" && label.trim()) ||
      field?.labels?.plural ||
      field?.labels?.singular ||
      config.title;
    const isRequired =
      config.forceShowRequired === true || field?.required === true;
    const {
      value,
      setValue,
      showError: showValidationError,
      errorMessage: validationErrorMessage,
    } = useField<unknown>({ path });

    const rows = React.useMemo(() => normalizeValueRows(value), [value]);
    const docInfo = useDocumentInfo();

    // If Payload admin form state fails to hydrate seeded array values (observed after refresh
    // with array Field overrides), pull the persisted value via same-origin REST and hydrate it
    // once. This does NOT overwrite non-empty form state.
    React.useEffect(() => {
      let cancelled = false;
      const run = async () => {
        try {
          if (rows.length > 0) return;
          const id = (docInfo as any)?.id ?? (docInfo as any)?.docID ?? null;
          if (!id) return;
          const pathName =
            typeof window !== "undefined" ? window.location.pathname : "";
          const match = pathName.match(/\/admin\/collections\/([^/]+)\/([^/]+)/);
          const collection = match?.[1];
          if (!collection) return;
          const res = await fetch(`/api/${collection}/${encodeURIComponent(String(id))}?depth=0`);
          if (!res.ok) return;
          const doc = (await res.json()) as any;
          const nextVal = doc?.[path];
          const parsed = normalizeValueRows(nextVal);
          if (!cancelled && parsed.length > 0) {
            setValue(rowsToFormValue(parsed));
          }
        } catch {
          // ignore (best-effort hydration)
        }
      };
      void run();
      return () => {
        cancelled = true;
      };
    }, [docInfo, path, rows.length, setValue]);
    const selectedLower = React.useMemo(
      () => new Set(rows.map((r) => r.value.toLowerCase())),
      [rows],
    );

    const [draft, setDraft] = React.useState("");
    const [options, setOptions] = React.useState<string[]>([]);
    const [open, setOpen] = React.useState(false);
    const [fetchErrorMessage, setFetchErrorMessage] = React.useState<string | null>(null);
    const wrapRef = React.useRef<HTMLDivElement>(null);

    const suggested = React.useMemo(
      () =>
        config.suggestedOptions
          .filter((s) => !selectedLower.has(s.toLowerCase()))
          .slice(0, 3),
      [selectedLower],
    );

    React.useEffect(() => {
      const onDoc = (e: MouseEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    React.useEffect(() => {
      let cancelled = false;
      const run = async () => {
        try {
          const loaded = await loadAutocompleteOptions(config.autocompleteType, draft);
          if (!cancelled) {
            setOptions(loaded);
            setFetchErrorMessage(null);
          }
        } catch (err) {
          if (!cancelled) {
            setFetchErrorMessage(
              err instanceof Error ? err.message : config.fetchErrorLabel,
            );
          }
        }
      };
      const t = setTimeout(() => void run(), 250);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }, [draft]);

    const filteredOptions = React.useMemo(
      () => options.filter((o) => !selectedLower.has(o.toLowerCase())).slice(0, 12),
      [options, selectedLower],
    );

    const addItem = React.useCallback(
      (raw: string) => {
        const next = raw.trim();
        if (!next) return;
        if (rows.length >= maxRows) return;
        if (selectedLower.has(next.toLowerCase())) return;
        setValue(rowsToFormValue([...rows, { value: next }]));
        setDraft("");
        setOpen(false);
      },
      [maxRows, rows, setValue, selectedLower],
    );

    const removeAt = React.useCallback(
      (index: number) => {
        const next = rows.filter((_, i) => i !== index);
        setValue(rowsToFormValue(next));
      },
      [rows, setValue],
    );

    return React.createElement(
      "div",
      { ref: wrapRef, className: B },
      React.createElement(
        "h3",
        { className: `${B}__title` },
        displayTitle,
        isRequired
          ? React.createElement(
              "span",
              { className: `${B}__requiredMark`, "aria-hidden": "true" },
              " *",
            )
          : null,
      ),
      React.createElement(
        "div",
        { className: `${B}__helperRow` },
        React.createElement(
          "p",
          { className: `${B}__helperText` },
          config.getHelperText(maxRows),
        ),
        React.createElement(
          "span",
          { className: `${B}__count` },
          `${rows.length}/${maxRows}`,
        ),
      ),
      React.createElement(
        "div",
        { className: `${B}__anchor` },
        React.createElement(
          "div",
          {
            className: showValidationError
              ? `${B}__control ${B}__control--error`
              : `${B}__control`,
          },
          ...rows.map((row, index) =>
            React.createElement(
              "span",
              { key: row.id ?? `${row.value}-${index}`, className: `${B}__chip` },
              React.createElement("span", { className: `${B}__chipText` }, row.value),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: `${B}__chipRemove`,
                  "aria-label": `Remove ${row.value}`,
                  onClick: () => removeAt(index),
                },
                "×",
              ),
            ),
          ),
          React.createElement("input", {
            type: "text",
            value: draft,
            placeholder: config.placeholder,
            className: `${B}__input`,
            "aria-invalid": showValidationError ? "true" : undefined,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              setDraft(e.target.value);
              setOpen(true);
            },
            onFocus: () => setOpen(true),
            onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const d = draft.trim();
                if (!d) return;
                const exact = filteredOptions.find(
                  (o) => o.toLowerCase() === d.toLowerCase(),
                );
                addItem(exact ?? d);
              } else if (e.key === "Backspace" && !draft && rows.length > 0) {
                removeAt(rows.length - 1);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            },
          }),
          React.createElement("span", { className: `${B}__searchGlyph` }, "⌕"),
        ),
        open && filteredOptions.length > 0
          ? React.createElement(
              "ul",
              { className: `${B}__list`, role: "listbox" },
              ...filteredOptions.map((opt) =>
                React.createElement(
                  "li",
                  {
                    key: opt,
                    role: "option",
                    className: `${B}__listItem`,
                    tabIndex: 0,
                    onMouseDown: (ev: React.MouseEvent) => {
                      ev.preventDefault();
                      addItem(opt);
                    },
                  },
                  opt,
                ),
              ),
            )
          : null,
      ),
      suggested.length > 0
        ? React.createElement(
            "div",
            { className: `${B}__suggestedSection` },
            React.createElement(
              "span",
              { className: `${B}__suggestedLabel` },
              config.suggestedHeading,
            ),
            React.createElement(
              "div",
              { className: `${B}__suggestedWrap` },
              ...suggested.map((s) =>
                React.createElement(
                  "button",
                  {
                    key: s,
                    type: "button",
                    className: `${B}__suggestedBtn`,
                    onClick: () => addItem(s),
                  },
                  s,
                  React.createElement(
                    "span",
                    { className: `${B}__suggestedBtnPlus` },
                    "+",
                  ),
                ),
              ),
            ),
          )
        : null,
      fetchErrorMessage
        ? React.createElement(
            "p",
            { className: `${B}__error` },
            fetchErrorMessage,
            ".",
          )
        : null,
      showValidationError && validationErrorMessage
        ? React.createElement(
            "p",
            { className: `${B}__error` },
            validationErrorMessage,
          )
        : null,
    );
  };

  ChipArrayTagsFieldImpl.displayName = `ChipArrayTagsField(${config.autocompleteType})`;
  return ChipArrayTagsFieldImpl;
}

export const ProjectSkillsTagsField = createChipArrayTagsField({
  title: "Skills",
  forceShowRequired: true,
  autocompleteType: "skills",
  placeholder: "Add Skills",
  getHelperText: (maxRows) =>
    `List up to ${String(maxRows)} key skills or proficiencies.`,
  defaultMaxRows: 10,
  suggestedOptions: FALLBACK_SKILL_OPTIONS,
  suggestedHeading: "Suggested Skills",
  fetchErrorLabel: "Failed to load skill suggestions",
});

export const ProjectTagsChipField = createChipArrayTagsField({
  title: "Tags",
  forceShowRequired: true,
  autocompleteType: "search_keywords",
  placeholder: "Add Tags",
  getHelperText: (maxRows) =>
    `Add up to ${String(maxRows)} tags that best describe your project (publish-project parity).`,
  defaultMaxRows: 10,
  suggestedOptions: FALLBACK_TAG_OPTIONS,
  suggestedHeading: "Suggested Tags",
  fetchErrorLabel: "Failed to load tag suggestions",
});

export const ProjectIndustriesChipField = createChipArrayTagsField({
  title: "Industries",
  forceShowRequired: true,
  autocompleteType: "industries",
  placeholder: "Add Industry",
  getHelperText: (maxRows) =>
    `Add up to ${String(maxRows)} industries that align with your project (publish-project parity).`,
  defaultMaxRows: 5,
  suggestedOptions: FALLBACK_INDUSTRY_OPTIONS,
  suggestedHeading: "Suggested Industries",
  fetchErrorLabel: "Failed to load industry suggestions",
});
