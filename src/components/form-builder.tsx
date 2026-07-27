"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Plus, X } from "lucide-react";

import { FormRenderer } from "@/components/form-renderer";
import {
  MAX_FIELDS,
  MAX_LABEL_LENGTH,
  MAX_OPTIONS,
  MAX_OPTION_LENGTH,
  fieldTypeLabels,
  fieldTypes,
  generateFieldId,
  isOptionType,
  parseFormSchema,
  serializeFields,
  validateFormSchema,
  type FieldType,
  type FormField
} from "@/lib/form-schema";

type FormBuilderProps = {
  value: string;
  onChange: (nextValue: string) => void;
};

type EditorMode = "visual" | "json";

function fieldsFromValue(value: string): { fields: FormField[]; parseable: boolean } {
  const parsed = parseFormSchema(value);

  if (parsed.kind === "form") {
    return { fields: parsed.schema.fields, parseable: true };
  }

  if (parsed.kind === "empty") {
    return { fields: [], parseable: true };
  }

  return { fields: [], parseable: false };
}

function createField(existingIds: readonly string[]): FormField {
  return {
    id: generateFieldId(existingIds),
    label: "",
    type: "text",
    required: false
  };
}

export function FormBuilder({ value, onChange }: FormBuilderProps) {
  const [initial] = useState(() => fieldsFromValue(value));
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [mode, setMode] = useState<EditorMode>(initial.parseable ? "visual" : "json");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(value);
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(true);

  const editingField = editingIndex === null ? undefined : fields[editingIndex];

  function commitFields(nextFields: FormField[]) {
    setFields(nextFields);
    onChange(serializeFields(nextFields));
  }

  function updateEditingField(patch: Partial<FormField>) {
    if (editingIndex === null) {
      return;
    }

    const nextFields = fields.map((field, index) => (index === editingIndex ? { ...field, ...patch } : field));
    commitFields(nextFields);
  }

  function changeFieldType(nextType: FieldType) {
    if (editingIndex === null || !editingField) {
      return;
    }

    const patch: Partial<FormField> = { type: nextType };

    if (isOptionType(nextType)) {
      patch.options = editingField.options?.length ? editingField.options : ["选项 1", "选项 2"];
      patch.placeholder = nextType === "select" ? editingField.placeholder : undefined;
    } else {
      patch.options = undefined;
      patch.maxSelect = undefined;
    }

    if (nextType !== "checkbox") {
      patch.maxSelect = undefined;
    }

    updateEditingField(patch);
  }

  function addField() {
    if (fields.length >= MAX_FIELDS) {
      return;
    }

    const nextFields = [
      ...fields,
      createField(fields.map((field) => field.id))
    ];
    commitFields(nextFields);
    setConfirmingDelete(false);
    setEditingIndex(nextFields.length - 1);
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= fields.length) {
      return;
    }

    const nextFields = [...fields];
    [nextFields[index], nextFields[target]] = [nextFields[target], nextFields[index]];
    commitFields(nextFields);
  }

  function deleteEditingField() {
    if (editingIndex === null) {
      return;
    }

    commitFields(fields.filter((_, index) => index !== editingIndex));
    setEditingIndex(null);
    setConfirmingDelete(false);
  }

  function closeEditor() {
    if (editingIndex !== null && editingField && !editingField.label.trim()) {
      commitFields(fields.filter((_, index) => index !== editingIndex));
    }

    setEditingIndex(null);
    setConfirmingDelete(false);
  }

  function updateOption(optionIndex: number, nextValue: string) {
    if (!editingField) {
      return;
    }

    const options = [...(editingField.options ?? [])];
    options[optionIndex] = nextValue;
    updateEditingField({ options });
  }

  function addOption() {
    if (!editingField) {
      return;
    }

    const options = editingField.options ?? [];

    if (options.length >= MAX_OPTIONS) {
      return;
    }

    updateEditingField({ options: [...options, ""] });
  }

  function removeOption(optionIndex: number) {
    if (!editingField) {
      return;
    }

    updateEditingField({ options: (editingField.options ?? []).filter((_, index) => index !== optionIndex) });
  }

  function enterJsonMode() {
    setJsonDraft(serializeFields(fields) || value);
    setJsonErrors([]);
    setMode("json");
    setEditingIndex(null);
    setConfirmingDelete(false);
  }

  function formatJsonDraft() {
    try {
      setJsonDraft(JSON.stringify(JSON.parse(jsonDraft), null, 2));
      setJsonErrors([]);
    } catch {
      setJsonErrors(["不是合法的 JSON，无法格式化。"]);
    }
  }

  function leaveJsonMode() {
    const validation = validateFormSchema(jsonDraft);

    if (!validation.ok) {
      setJsonErrors(validation.errors);
      return;
    }

    setJsonErrors([]);
    commitFields(validation.schema.fields);
    setMode("visual");
  }

  const editingOptionsTooFew =
    editingField && isOptionType(editingField.type) && (editingField.options ?? []).filter((option) => option.trim()).length < 2;

  return (
    <div className="form-builder">
      {mode === "visual" ? (
        <>
          <p className="form-builder-caption">报名问题</p>
          <div className="form-builder-list">
            {fields.length === 0 && (
              <p className="form-builder-empty">还没有报名问题。参与者只需填写昵称、联系方式和人数。</p>
            )}
            {fields.map((field, index) => (
              <div className="form-builder-row" key={field.id}>
                <button
                  className="form-builder-row-main"
                  type="button"
                  onClick={() => {
                    setConfirmingDelete(false);
                    setEditingIndex(index);
                  }}
                >
                  <span className="form-builder-row-label">{field.label.trim() || "未命名问题"}</span>
                  <span className="form-builder-row-meta">
                    {fieldTypeLabels[field.type]}
                    {field.required ? " · 必填" : ""}
                  </span>
                </button>
                <div className="form-builder-row-actions">
                  <button
                    aria-label={`上移「${field.label || "未命名问题"}」`}
                    className="form-builder-move"
                    disabled={index === 0}
                    type="button"
                    onClick={() => moveField(index, -1)}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    aria-label={`下移「${field.label || "未命名问题"}」`}
                    className="form-builder-move"
                    disabled={index === fields.length - 1}
                    type="button"
                    onClick={() => moveField(index, 1)}
                  >
                    <ChevronDown size={16} />
                  </button>
                  <ChevronRight className="form-builder-chevron" size={16} />
                </div>
              </div>
            ))}
            <button className="form-builder-add" disabled={fields.length >= MAX_FIELDS} type="button" onClick={addField}>
              <Plus size={16} />
              添加问题
              {fields.length >= MAX_FIELDS ? `（最多 ${MAX_FIELDS} 个）` : ""}
            </button>
          </div>
          <div className="form-builder-footer">
            <button className="form-builder-json-link" type="button" onClick={enterJsonMode}>
              使用高级 JSON 模式
            </button>
          </div>

          <div className="form-builder-preview">
            <button className="form-builder-preview-toggle" type="button" onClick={() => setPreviewOpen((open) => !open)}>
              <span>参与者视角 · 实时预览</span>
              {previewOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {previewOpen && (
              <div className="form-builder-preview-body">
                {fields.filter((field) => field.label.trim()).length > 0 ? (
                  <FormRenderer
                    answers={{}}
                    fields={fields.filter((field) => field.label.trim())}
                    idPrefix="preview"
                    readOnly
                  />
                ) : (
                  <p className="form-builder-preview-empty">还没有报名问题，参与者只需填基础信息。</p>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="form-builder-json">
          <p className="form-builder-json-warning">高级模式：直接编辑 JSON 可能破坏表单结构，保存前会先校验。</p>
          <textarea
            aria-label="表单 JSON 配置"
            rows={10}
            spellCheck={false}
            value={jsonDraft}
            onChange={(event) => setJsonDraft(event.target.value)}
          />
          {jsonErrors.length > 0 && (
            <ul className="form-builder-json-errors">
              {jsonErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          <div className="form-builder-json-actions">
            <button className="button secondary compact" type="button" onClick={formatJsonDraft}>
              格式化
            </button>
            <button className="button primary compact" type="button" onClick={leaveJsonMode}>
              返回可视化编辑
            </button>
          </div>
        </div>
      )}

      {editingField && editingIndex !== null && (
        <div aria-modal="true" className="field-sheet-backdrop" role="dialog" onClick={closeEditor}>
          <div className="field-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="field-sheet-header">
              <h3>编辑问题</h3>
              <button className="field-sheet-done" type="button" onClick={closeEditor}>
                完成
              </button>
            </div>

            <p className="form-builder-caption">问题类型</p>
            <div className="field-type-grid">
              {fieldTypes.map((type) => (
                <button
                  className={`field-type-option ${editingField.type === type ? "selected" : ""}`}
                  key={type}
                  type="button"
                  onClick={() => changeFieldType(type)}
                >
                  {fieldTypeLabels[type]}
                </button>
              ))}
            </div>

            <div className="field-sheet-group">
              <label className="field-sheet-input-row">
                <span>问题标题</span>
                <input
                  maxLength={MAX_LABEL_LENGTH}
                  placeholder="例如：预计到达时间"
                  value={editingField.label}
                  onChange={(event) => updateEditingField({ label: event.target.value })}
                />
              </label>
              {!isOptionType(editingField.type) || editingField.type === "select" ? (
                <label className="field-sheet-input-row">
                  <span>占位提示</span>
                  <input
                    placeholder="选填，显示在输入框内"
                    value={editingField.placeholder ?? ""}
                    onChange={(event) => updateEditingField({ placeholder: event.target.value || undefined })}
                  />
                </label>
              ) : null}
            </div>

            {isOptionType(editingField.type) && (
              <div className="field-sheet-group">
                <p className="form-builder-caption">选项</p>
                {(editingField.options ?? []).map((option, optionIndex) => (
                  <div className="field-sheet-option-row" key={optionIndex}>
                    <input
                      maxLength={MAX_OPTION_LENGTH}
                      placeholder={`选项 ${optionIndex + 1}`}
                      value={option}
                      onChange={(event) => updateOption(optionIndex, event.target.value)}
                    />
                    <button
                      aria-label={`删除选项 ${optionIndex + 1}`}
                      className="field-sheet-option-remove"
                      type="button"
                      onClick={() => removeOption(optionIndex)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  className="form-builder-add"
                  disabled={(editingField.options ?? []).length >= MAX_OPTIONS}
                  type="button"
                  onClick={addOption}
                >
                  <Plus size={16} />
                  添加选项
                </button>
                {editingOptionsTooFew && <p className="field-sheet-error">至少需要 2 个选项。</p>}
              </div>
            )}

            <div className="field-sheet-group">
              <div className="field-sheet-switch-row">
                <span>必填</span>
                <button
                  aria-checked={editingField.required}
                  className={`ios-switch ${editingField.required ? "on" : ""}`}
                  role="switch"
                  type="button"
                  onClick={() => updateEditingField({ required: !editingField.required })}
                >
                  <span className="ios-switch-knob" />
                </button>
              </div>
            </div>

            <div className="field-sheet-group">
              {confirmingDelete ? (
                <div className="field-sheet-delete-confirm">
                  <button className="field-sheet-delete" type="button" onClick={deleteEditingField}>
                    确认删除？
                  </button>
                  <button className="field-sheet-cancel" type="button" onClick={() => setConfirmingDelete(false)}>
                    取消
                  </button>
                </div>
              ) : (
                <button className="field-sheet-delete" type="button" onClick={() => setConfirmingDelete(true)}>
                  删除此问题
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
