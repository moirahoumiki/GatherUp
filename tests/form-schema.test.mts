import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAnswersPayload,
  generateFieldId,
  parseFormSchema,
  serializeFields,
  validateAnswers,
  validateFormSchema,
  type FormField
} from "../src/lib/form-schema.ts";

describe("parseFormSchema", () => {
  it("parses the legacy mock schema shape", () => {
    const legacy = JSON.stringify({
      fields: [
        { id: "arrival_time", label: "预计到达时间", type: "text", required: false },
        { id: "notes", label: "报名备注", type: "textarea", required: false }
      ]
    });
    const parsed = parseFormSchema(legacy);

    assert.equal(parsed.kind, "form");
    assert.ok(parsed.kind === "form");
    assert.equal(parsed.schema.fields.length, 2);
    assert.deepEqual(
      parsed.schema.fields.map((field) => field.type),
      ["text", "textarea"]
    );
    assert.equal(parsed.schema.fields[0].id, "arrival_time");
  });

  it("accepts an already-parsed object", () => {
    const parsed = parseFormSchema({ fields: [{ id: "a", label: "A", type: "radio", required: true, options: ["x", "y"] }] });

    assert.ok(parsed.kind === "form");
    assert.deepEqual(parsed.schema.fields[0].options, ["x", "y"]);
    assert.equal(parsed.schema.fields[0].required, true);
  });

  it("treats empty / blank / {} input as empty", () => {
    assert.equal(parseFormSchema("").kind, "empty");
    assert.equal(parseFormSchema("   ").kind, "empty");
    assert.equal(parseFormSchema("{}").kind, "empty");
    assert.equal(parseFormSchema(null).kind, "empty");
    assert.equal(parseFormSchema(undefined).kind, "empty");
    assert.equal(parseFormSchema({ fields: [] }).kind, "empty");
  });

  it("falls back on invalid JSON and normalizeJsonInput {text:...} payloads", () => {
    assert.equal(parseFormSchema("not json at all").kind, "fallback");
    assert.equal(parseFormSchema({ text: "自由备注" }).kind, "fallback");
    assert.equal(parseFormSchema('{"fields": "oops"}').kind, "fallback");
    assert.equal(parseFormSchema([1, 2]).kind, "fallback");
  });

  it("downgrades unknown field types to text and drops broken fields", () => {
    const parsed = parseFormSchema({
      fields: [
        { id: "a", label: "A", type: "rating", required: false },
        { id: "b", label: "" },
        "garbage",
        { label: "无 id 的问题", type: "textarea" }
      ]
    });

    assert.ok(parsed.kind === "form");
    assert.equal(parsed.schema.fields.length, 3);
    assert.equal(parsed.schema.fields[0].type, "text");
    assert.equal(parsed.schema.fields[1].id, "b");
    assert.equal(parsed.schema.fields[1].label, "b");
    assert.ok(parsed.schema.fields[2].id.startsWith("q_"));
  });

  it("deduplicates repeated field ids", () => {
    const parsed = parseFormSchema({
      fields: [
        { id: "dup", label: "一", type: "text" },
        { id: "dup", label: "二", type: "text" }
      ]
    });

    assert.ok(parsed.kind === "form");
    assert.equal(parsed.schema.fields.length, 1);
    assert.equal(parsed.schema.fields[0].label, "一");
  });

  it("keeps checkbox maxSelect and trims options", () => {
    const parsed = parseFormSchema({
      fields: [{ id: "c", label: "渠道", type: "checkbox", options: [" 微信群 ", "", "朋友"], maxSelect: 2 }]
    });

    assert.ok(parsed.kind === "form");
    assert.deepEqual(parsed.schema.fields[0].options, ["微信群", "朋友"]);
    assert.equal(parsed.schema.fields[0].maxSelect, 2);
  });
});

describe("serializeFields", () => {
  it("round-trips through parseFormSchema", () => {
    const fields: FormField[] = [
      { id: "phone", label: "手机号", type: "phone", required: true, placeholder: "例如 138..." },
      { id: "channel", label: "渠道", type: "select", required: false, options: ["微信", "微博"] }
    ];
    const serialized = serializeFields(fields);
    const parsed = parseFormSchema(serialized);

    assert.ok(parsed.kind === "form");
    assert.deepEqual(parsed.schema.fields, fields);
    assert.match(serialized, /"version": 1/);
  });

  it("returns empty string for zero fields", () => {
    assert.equal(serializeFields([]), "");
  });
});

describe("validateFormSchema", () => {
  it("accepts valid JSON and empty input", () => {
    assert.equal(validateFormSchema("").ok, true);
    const result = validateFormSchema('{"fields":[{"id":"a","label":"A","type":"text"}]}');

    assert.ok(result.ok);
    assert.equal(result.schema.fields.length, 1);
  });

  it("reports positioned errors", () => {
    const result = validateFormSchema(
      JSON.stringify({
        fields: [
          { id: "a", type: "text" },
          { id: "b", label: "B", type: "rating" },
          { id: "a", label: "重复", type: "radio", options: ["仅一项"] }
        ]
      })
    );

    assert.ok(!result.ok);
    assert.ok(result.errors.some((error) => error.includes("第 1 个问题") && error.includes("label")));
    assert.ok(result.errors.some((error) => error.includes("第 2 个问题") && error.includes("rating")));
    assert.ok(result.errors.some((error) => error.includes("重复")));
    assert.ok(result.errors.some((error) => error.includes("至少需要 2 个选项")));
  });

  it("rejects broken JSON and wrong top-level shapes", () => {
    assert.ok(!validateFormSchema("{oops").ok);
    assert.ok(!validateFormSchema("[1]").ok);
    assert.ok(!validateFormSchema('{"no_fields": true}').ok);
  });
});

describe("validateAnswers / buildAnswersPayload", () => {
  const fields: FormField[] = [
    { id: "name", label: "称呼", type: "text", required: true },
    { id: "phone", label: "手机号", type: "phone", required: false },
    { id: "wechat", label: "微信号", type: "wechat", required: false },
    { id: "channels", label: "渠道", type: "checkbox", required: true, options: ["微信群", "朋友"] }
  ];

  it("blocks missing required answers", () => {
    const { blocking } = validateAnswers(fields, {});

    assert.ok(blocking.name);
    assert.ok(blocking.channels);
    assert.equal(Object.keys(blocking).length, 2);
  });

  it("passes when required answers are provided, warns softly on format", () => {
    const { blocking, warnings } = validateAnswers(fields, {
      name: "Miki",
      phone: "123",
      wechat: "!!bad",
      channels: ["微信群"]
    });

    assert.equal(Object.keys(blocking).length, 0);
    assert.ok(warnings.phone);
    assert.ok(warnings.wechat);
  });

  it("does not warn on valid phone/wechat", () => {
    const { warnings } = validateAnswers(fields, {
      name: "Miki",
      phone: "13800000000",
      wechat: "gatherup_2026",
      channels: ["朋友"]
    });

    assert.equal(Object.keys(warnings).length, 0);
  });

  it("builds a flat {fieldId: value} payload, skipping empties", () => {
    const payload = buildAnswersPayload(fields, {
      name: "  Miki  ",
      phone: "",
      channels: ["微信群", " 朋友 ", ""]
    });

    assert.deepEqual(payload, { name: "Miki", channels: ["微信群", "朋友"] });
  });
});

describe("generateFieldId", () => {
  it("avoids collisions with existing ids", () => {
    const existing = ["q_aaa"];
    const id = generateFieldId(existing);

    assert.ok(id.startsWith("q_"));
    assert.ok(!existing.includes(id));
  });
});
