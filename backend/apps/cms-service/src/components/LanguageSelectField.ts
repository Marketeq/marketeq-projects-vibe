import React from "react";
import { useField } from "payload/components/forms";

import "./CategoryFields.scss";

const B = "marketeq-categoryField";

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Hindi",
  "Arabic",
  "Portuguese",
  "Italian",
  "Russian",
  "Chinese",
  "Japanese",
  "Korean",
];

function resolveSiblingPath(basePath: string, targetFieldName: string): string {
  if (!targetFieldName) return basePath;
  if (!basePath.includes(".")) return targetFieldName;
  return `${basePath.split(".").slice(0, -1).join(".")}.${targetFieldName}`;
}

type FieldProps = {
  path: string;
  field?: {
    custom?: {
      targetPath?: string;
      label?: string;
    };
  };
};

const LanguageSelectField: React.FC<FieldProps> = ({ path, field }) => {
  const targetPath = resolveSiblingPath(
    path,
    field?.custom?.targetPath ?? "language",
  );

  const { value, setValue, showError, errorMessage } = useField<string>({
    path: targetPath,
  });

  const selectedValue = typeof value === "string" ? value : "";

  return React.createElement(
    "div",
    { className: B },
    React.createElement(
      "label",
      { htmlFor: path, className: `${B}__label` },
      `${field?.custom?.label ?? "Language"} *`,
    ),
    React.createElement(
      "select",
      {
        id: path,
        className: `${B}__control`,
        value: selectedValue,
        "aria-invalid": showError ? "true" : undefined,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
          const next = event.target.value;
          setValue(next);
        },
      },
      React.createElement("option", { value: "" }, "Select language"),
      ...LANGUAGE_OPTIONS.map((language) =>
        React.createElement(
          "option",
          { key: language, value: language },
          language,
        ),
      ),
    ),
    showError && errorMessage
      ? React.createElement("p", { className: `${B}__error` }, errorMessage)
      : null,
  );
};

export default LanguageSelectField;
