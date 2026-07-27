export const fieldTypes = ["text", "textarea", "radio", "checkbox", "select", "phone", "wechat"] as const;

export type FieldType = (typeof fieldTypes)[number];

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  maxSelect?: number;
};

export type FormSchema = {
  fields: FormField[];
  version?: 1;
};

export type AnswerValue = string | string[];
export type FormAnswers = Record<string, AnswerValue>;

export type ParsedFormSchema =
  | { kind: "form"; schema: FormSchema }
  | { kind: "empty" }
  | { kind: "fallback"; raw: unknown };

export const MAX_FIELDS = 12;
export const MAX_LABEL_LENGTH = 40;
export const MAX_OPTIONS = 20;
export const MAX_OPTION_LENGTH = 30;

export const fieldTypeLabels: Record<FieldType, string> = {
  text: "单行文本",
  textarea: "多行文本",
  radio: "单选",
  checkbox: "多选",
  select: "下拉",
  phone: "手机号",
  wechat: "微信号"
};

const optionTypes: readonly FieldType[] = ["radio", "checkbox", "select"];

export function isOptionType(type: FieldType) {
  return optionTypes.includes(type);
}

function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && (fieldTypes as readonly string[]).includes(value);
}

export function generateFieldId(existingIds: readonly string[]) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `q_${Math.random().toString(36).slice(2, 8)}`;

    if (!existingIds.includes(candidate)) {
      return candidate;
    }
  }

  return `q_${Date.now().toString(36)}`;
}

function normalizeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeField(raw: unknown, existingIds: string[]): FormField | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const rawLabel = typeof record.label === "string" ? record.label.trim() : "";
  const rawId = typeof record.id === "string" ? record.id.trim() : "";

  if (!rawLabel && !rawId) {
    return null;
  }

  const type = isFieldType(record.type) ? record.type : "text";
  const field: FormField = {
    id: rawId || generateFieldId(existingIds),
    label: rawLabel || rawId,
    type,
    required: record.required === true
  };

  if (typeof record.placeholder === "string" && record.placeholder.trim()) {
    field.placeholder = record.placeholder.trim();
  }

  if (isOptionType(type)) {
    field.options = normalizeOptions(record.options);
  }

  if (type === "checkbox" && typeof record.maxSelect === "number" && Number.isInteger(record.maxSelect) && record.maxSelect > 0) {
    field.maxSelect = record.maxSelect;
  }

  return field;
}

export function parseFormSchema(input: unknown): ParsedFormSchema {
  let value = input;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return { kind: "empty" };
    }

    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return { kind: "fallback", raw: input };
    }
  }

  if (value === undefined || value === null) {
    return { kind: "empty" };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return { kind: "fallback", raw: input };
  }

  const record = value as Record<string, unknown>;

  if (!("fields" in record)) {
    return Object.keys(record).length === 0 ? { kind: "empty" } : { kind: "fallback", raw: input };
  }

  if (!Array.isArray(record.fields)) {
    return { kind: "fallback", raw: input };
  }

  const fields: FormField[] = [];

  for (const rawField of record.fields) {
    const field = normalizeField(
      rawField,
      fields.map((item) => item.id)
    );

    if (field && !fields.some((item) => item.id === field.id)) {
      fields.push(field);
    }
  }

  if (fields.length === 0) {
    return { kind: "empty" };
  }

  return { kind: "form", schema: { fields, version: 1 } };
}

export function serializeFields(fields: readonly FormField[]) {
  if (fields.length === 0) {
    return "";
  }

  return JSON.stringify({ fields, version: 1 }, null, 2);
}

export type SchemaValidation = { ok: true; schema: FormSchema } | { ok: false; errors: string[] };

export function validateFormSchema(input: string): SchemaValidation {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: true, schema: { fields: [], version: 1 } };
  }

  let value: unknown;

  try {
    value = JSON.parse(trimmed);
  } catch {
    return { ok: false, errors: ["不是合法的 JSON，请检查引号、逗号和括号。"] };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, errors: ["顶层必须是对象，例如 {\"fields\": []}。"] };
  }

  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.fields)) {
    return { ok: false, errors: ["缺少 fields 数组。"] };
  }

  const errors: string[] = [];
  const seenIds = new Set<string>();

  if (record.fields.length > MAX_FIELDS) {
    errors.push(`最多支持 ${MAX_FIELDS} 个问题，当前有 ${record.fields.length} 个。`);
  }

  record.fields.forEach((rawField, index) => {
    const position = `第 ${index + 1} 个问题`;

    if (typeof rawField !== "object" || rawField === null || Array.isArray(rawField)) {
      errors.push(`${position}必须是对象。`);
      return;
    }

    const field = rawField as Record<string, unknown>;

    if (typeof field.label !== "string" || !field.label.trim()) {
      errors.push(`${position}缺少 label（问题标题）。`);
    }

    if (field.type !== undefined && !isFieldType(field.type)) {
      errors.push(`${position}的 type「${String(field.type)}」不受支持，可用：${fieldTypes.join(" / ")}。`);
    }

    if (typeof field.id === "string" && field.id.trim()) {
      if (seenIds.has(field.id.trim())) {
        errors.push(`${position}的 id「${field.id.trim()}」与前面的问题重复。`);
      }
      seenIds.add(field.id.trim());
    }

    if (isFieldType(field.type) && isOptionType(field.type)) {
      const options = normalizeOptions(field.options);

      if (options.length < 2) {
        errors.push(`${position}（${fieldTypeLabels[field.type]}）至少需要 2 个选项。`);
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const parsed = parseFormSchema(record);

  if (parsed.kind === "form") {
    return { ok: true, schema: parsed.schema };
  }

  return { ok: true, schema: { fields: [], version: 1 } };
}

const phonePattern = /^1\d{10}$/;
const wechatPattern = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/;

export type AnswersValidation = {
  blocking: Record<string, string>;
  warnings: Record<string, string>;
};

export function validateAnswers(fields: readonly FormField[], answers: FormAnswers): AnswersValidation {
  const blocking: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  for (const field of fields) {
    const value = answers[field.id];

    if (field.type === "checkbox") {
      const selected = Array.isArray(value) ? value.filter(Boolean) : [];

      if (field.required && selected.length === 0) {
        blocking[field.id] = "这是必填问题，请至少选择一项。";
      }

      continue;
    }

    const text = typeof value === "string" ? value.trim() : "";

    if (field.required && !text) {
      blocking[field.id] = "这是必填问题，请填写后再提交。";
      continue;
    }

    if (!text) {
      continue;
    }

    if (field.type === "phone" && !phonePattern.test(text)) {
      warnings[field.id] = "手机号一般是 1 开头的 11 位数字，请确认。";
    }

    if (field.type === "wechat" && !wechatPattern.test(text)) {
      warnings[field.id] = "微信号一般是字母开头的 6-20 位字符，请确认。";
    }
  }

  return { blocking, warnings };
}

export function buildAnswersPayload(fields: readonly FormField[], answers: FormAnswers): Record<string, AnswerValue> {
  const payload: Record<string, AnswerValue> = {};

  for (const field of fields) {
    const value = answers[field.id];

    if (field.type === "checkbox") {
      const selected = Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : [];

      if (selected.length > 0) {
        payload[field.id] = selected;
      }

      continue;
    }

    const text = typeof value === "string" ? value.trim() : "";

    if (text) {
      payload[field.id] = text;
    }
  }

  return payload;
}
