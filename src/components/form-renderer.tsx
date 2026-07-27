"use client";

import type { FormAnswers, FormField } from "@/lib/form-schema";

type FormRendererProps = {
  fields: FormField[];
  answers: FormAnswers;
  onChange?: (fieldId: string, value: string | string[]) => void;
  errors?: Record<string, string>;
  warnings?: Record<string, string>;
  readOnly?: boolean;
  idPrefix?: string;
};

function toggleValue(current: string[], option: string, maxSelect?: number) {
  if (current.includes(option)) {
    return current.filter((item) => item !== option);
  }

  if (maxSelect && current.length >= maxSelect) {
    return current;
  }

  return [...current, option];
}

export function FormRenderer({
  fields,
  answers,
  onChange,
  errors = {},
  warnings = {},
  readOnly = false,
  idPrefix = "dyn-form"
}: FormRendererProps) {
  function update(fieldId: string, value: string | string[]) {
    if (!readOnly) {
      onChange?.(fieldId, value);
    }
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="dynamic-form">
      {fields.map((field) => {
        const rawValue = answers[field.id];
        const textValue = typeof rawValue === "string" ? rawValue : "";
        const listValue = Array.isArray(rawValue) ? rawValue : [];
        const error = errors[field.id];
        const warning = warnings[field.id];
        const controlId = `${idPrefix}-${field.id}`;

        return (
          <div className={`dynamic-field ${error ? "has-error" : ""}`} data-field-id={field.id} key={field.id}>
            <label className="dynamic-field-label" htmlFor={controlId}>
              {field.label}
              {field.required ? <span aria-label="必填" className="dynamic-field-required">*</span> : null}
            </label>

            {field.type === "text" && (
              <input
                disabled={readOnly}
                id={controlId}
                placeholder={field.placeholder ?? ""}
                type="text"
                value={textValue}
                onChange={(event) => update(field.id, event.target.value)}
              />
            )}

            {field.type === "textarea" && (
              <textarea
                disabled={readOnly}
                id={controlId}
                placeholder={field.placeholder ?? ""}
                rows={3}
                value={textValue}
                onChange={(event) => update(field.id, event.target.value)}
              />
            )}

            {field.type === "phone" && (
              <input
                disabled={readOnly}
                id={controlId}
                inputMode="numeric"
                placeholder={field.placeholder ?? "例如 13800000000"}
                type="tel"
                value={textValue}
                onChange={(event) => update(field.id, event.target.value)}
              />
            )}

            {field.type === "wechat" && (
              <input
                disabled={readOnly}
                id={controlId}
                placeholder={field.placeholder ?? "例如 gatherup_2026"}
                type="text"
                value={textValue}
                onChange={(event) => update(field.id, event.target.value)}
              />
            )}

            {field.type === "select" && (
              <select
                disabled={readOnly}
                id={controlId}
                value={textValue}
                onChange={(event) => update(field.id, event.target.value)}
              >
                <option value="">{field.placeholder ?? "请选择"}</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field.type === "radio" && (
              <div className="dynamic-option-group" role="radiogroup" aria-labelledby={controlId}>
                {(field.options ?? []).map((option) => (
                  <button
                    aria-checked={textValue === option}
                    className={`dynamic-option ${textValue === option ? "selected" : ""}`}
                    disabled={readOnly}
                    key={option}
                    role="radio"
                    type="button"
                    onClick={() => update(field.id, textValue === option ? "" : option)}
                  >
                    <span className="dynamic-option-mark radio" aria-hidden="true" />
                    {option}
                  </button>
                ))}
              </div>
            )}

            {field.type === "checkbox" && (
              <div className="dynamic-option-group">
                {(field.options ?? []).map((option) => (
                  <button
                    aria-pressed={listValue.includes(option)}
                    className={`dynamic-option ${listValue.includes(option) ? "selected" : ""}`}
                    disabled={readOnly}
                    key={option}
                    type="button"
                    onClick={() => update(field.id, toggleValue(listValue, option, field.maxSelect))}
                  >
                    <span className="dynamic-option-mark checkbox" aria-hidden="true" />
                    {option}
                  </button>
                ))}
                {field.maxSelect ? <p className="dynamic-field-hint">最多选择 {field.maxSelect} 项</p> : null}
              </div>
            )}

            {error && <p className="dynamic-field-error">{error}</p>}
            {!error && warning && <p className="dynamic-field-warning">{warning}</p>}
          </div>
        );
      })}
    </div>
  );
}
