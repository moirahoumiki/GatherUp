# 报名表单可视化编辑器 · 设计方案

> 日期：2026-07-23
> 状态：设计稿（未实现，不改产品代码）
> 对应短板：`docs/feature-walkthrough.md` 第四节第 2 条——"自定义报名表单要写 JSON（优先级：高）"
> 视觉规范：`design/proposals/README.md` v3「iOS 原生」

---

## 一、现状调研

### 1. 数据链路全景

| 环节 | 位置 | 现状 |
|---|---|---|
| schema 存储 | `supabase/schema.sql:387` `events.custom_form_config jsonb not null default '{}'` | 无结构约束，任意 JSON |
| 答案存储 | `supabase/schema.sql:519-520` `registrations.registration_answers` / `form_answers jsonb` | RPC 里两列写同一份答案 |
| 组织者填写入口 | `src/app/organizer/events/new/page.tsx:554`（向导第 ⑥ 步「收款座位」面板内，注意**不是第 ⑤ 步面板**，虽然功能梳理归在第 ⑤ 步"报名订单"话题下） | 一个 `<textarea rows={6}>` 直接编辑 JSON 字符串 |
| 默认示例 schema | `src/app/organizer/events/new/page.tsx:71-80` | `{"fields":[{id,label,type,required}]}`，type 只出现 `text` / `textarea` |
| mock 数据 schema | `src/lib/mock-data.ts:176-181` | 同上结构 |
| 发布提交 | `page.tsx:381` → `src/app/api/events/route.ts:99-100` `normalizeJsonInput()` | 字符串能 parse 就存对象；**parse 失败会包成 `{text:"原文"}` 落库**，坏 JSON 不报错 |
| 参与者端渲染 | `src/components/registration-flow.tsx:80,524` | **没有按 schema 动态渲染**——只是一个「自定义表单答案」textarea，让参与者手写 JSON（默认 `'{"notes":"..."}'`），提交 `form_answers` 字符串 → `api/orders/route.ts:62` normalize 后传 RPC |
| 名单导出 | `src/app/api/export/attendees/route.ts:82` | `JSON.stringify(form_answers)` 整包塞一个 Excel 单元格 |

### 2. 现有 schema 事实结构（约定俗成，无校验代码）

```json
{
  "fields": [
    { "id": "arrival_time", "label": "预计到达时间", "type": "text", "required": false },
    { "id": "notes", "label": "报名备注", "type": "textarea", "required": false }
  ]
}
```

- 出现过的 `type`：仅 `text`、`textarea`
- 答案约定：`{ "<field.id>": "字符串值" }`（见 `mock-data.ts:747` `formAnswers`）
- 没有 placeholder、options、校验规则等字段

### 3. 关键结论（影响方案）

1. **"兼容参与者端渲染"实际上是零负担**：参与者端目前根本不解析 schema，就是裸 JSON 输入框。因此 schema 可以放心扩展新字段类型——不存在"老渲染器认不出新类型"的问题。真正的兼容义务是：
   - 保持 `{fields:[...]}` 顶层结构和 `id/label/type/required` 四个既有键名不变（mock 数据、导出、已落库数据都按这个约定）；
   - 答案继续保持 `{fieldId: value}` 扁平对象，导出链路（Excel 整包 stringify）自动兼容。
2. 编辑器与参与者渲染器应**共享同一份 schema 类型定义与渲染组件**，一次实现两处受益（编辑器实时预览 = 参与者渲染器本体）。
3. `normalizeJsonInput` 的 `{text:...}` 兜底意味着历史数据里可能存在非 `{fields:[...]}` 的脏数据，渲染器必须容错：解析失败/结构不符时降级为现在的"备注 textarea"。

---

## 二、schema 设计（v1，向后兼容）

### 1. 字段类型清单与 schema 映射表

| # | 字段类型 | `type` 值 | 现 schema 支持？ | 专有属性 | 答案值类型 | 参与者端控件 |
|---|---|---|---|---|---|---|
| 1 | 单行文本 | `text` | ✅ 已有 | `placeholder?` | `string` | `<input type="text">` |
| 2 | 多行文本 | `textarea` | ✅ 已有 | `placeholder?` | `string` | `<textarea>` |
| 3 | 单选 | `radio` | ❌ 新增 | `options: string[]` | `string`（选项文本） | 选项卡片组（沿用 option-card 样式） |
| 4 | 多选 | `checkbox` | ❌ 新增 | `options: string[]`, `maxSelect?` | `string[]` | 多选卡片组 |
| 5 | 下拉 | `select` | ❌ 新增 | `options: string[]`, `placeholder?` | `string` | `<select>` |
| 6 | 手机号 | `phone` | ❌ 新增 | `placeholder?` | `string` | `<input type="tel">`，前端校验 `^1\d{10}$`（提示不阻断，弱校验） |
| 7 | 微信号 | `wechat` | ❌ 新增 | `placeholder?` | `string` | `<input>`，弱校验 `^[a-zA-Z][\w-]{5,19}$`（仅提示） |

通用属性（所有类型）：

```ts
type FormField = {
  id: string;            // 由 label 自动生成拼音/随机短 id，保证订单内唯一，创建后不再改
  label: string;         // 问题标题（必填）
  type: FieldType;       // 上表 7 种
  required: boolean;     // 必填开关
  placeholder?: string;  // 占位提示（选项类无此项）
  options?: string[];    // radio / checkbox / select 专用，≥2 项
  maxSelect?: number;    // checkbox 可选
};

type FormSchema = { fields: FormField[]; version?: 1 };
```

- `version` 可选、缺省按 v1 处理 → 旧数据（无 version）天然合法。
- 未知 `type` 的字段：渲染器降级为 `text`，不丢答案。
- 建议约束：最多 12 个字段；`label` ≤ 40 字；选项 ≤ 20 个、每项 ≤ 30 字。

### 2. 答案格式（不变）

```json
{ "arrival_time": "13:30", "channels": ["微信群", "朋友推荐"], "phone": "13800000000" }
```

多选为 `string[]`，其余为 `string`。导出链路无需改动（整包 stringify）；后续如做"答案分列导出"，按 schema 的 `fields` 顺序展开列即可。

---

## 三、交互方案

### 1. 入口与流程图（文字版）

```
创建向导（7 步）
 └─ 第 ⑤ 步「报名订单」                    ← 表单编辑器从第 ⑥ 步迁到这里（语义归位，
     ├─ 人数上限 / 截止时间 / 多人报名 / 订单编号      功能梳理文档也一直把它归在第 ⑤ 步）
     └─ ▼ 报名问题（inset-grouped 卡片）
         ├─ [问题行 1] 预计到达时间 · 单行文本 · 必填   (›)
         ├─ [问题行 2] 报名备注 · 多行文本              (›)
         ├─ ＋ 添加问题
         └─ 底部 caption 链接：「高级 JSON 模式」

点「＋ 添加问题」或点已有问题行 (›)
 └─ 弹出「问题编辑」底部抽屉（sheet）
     ├─ 类型选择（7 种，segmented 网格）
     ├─ 问题标题 input
     ├─ 占位提示 input（选项类隐藏）
     ├─ 选项编辑器（radio/checkbox/select 时出现）
     │   ├─ 选项行：input + 删除 ×
     │   └─ ＋ 添加选项
     ├─ 必填  [iOS switch]
     └─ [删除此问题]   [完成]

问题列表排序
 └─ 每行右侧 ↑ / ↓ 按钮（首行 ↑、末行 ↓ 置灰）；不做拖拽（触屏/桌面一致、实现成本低）

实时预览
 └─ 编辑器卡片右侧/下方「参与者视角预览」白卡：
     用真实渲染组件 <DynamicRegistrationForm schema={draft}/> 只读展示，
     schema 一变即重渲染

高级 JSON 模式（保留给高级用户）
 └─ 点 caption 链接 → 切换到 JSON textarea 视图（即现有控件）
     ├─ 顶部警示 caption：「手动编辑可能破坏结构」
     ├─ [格式化] [返回可视化编辑] 按钮
     └─ 返回可视化时先 parse + 结构校验：
         ├─ 合法 → 载入可视化编辑器
         └─ 不合法 → 内联报错（具体到第几个 field 缺什么），留在 JSON 模式
```

### 2. 状态与数据流

- 编辑器内部 state：`FormField[]`（结构化对象），**单一事实源**。
- 与向导草稿的衔接：保持 `form.customFormConfig` 仍是 JSON 字符串（`JSON.stringify(fields 包装成 FormSchema)`），这样：
  - localStorage 草稿键 `gatherup_event_draft_v0_1` 结构不变，老草稿可恢复；
  - 发布 payload（`page.tsx:381`）、`api/events` 的 `normalizeJsonInput` 全部零改动。
- 初始化：从草稿字符串 parse；失败或非 `{fields:[...]}` 结构 → 进入 JSON 模式并提示，不静默丢数据。

### 3. 参与者端（配套改造，兼容为先）

`registration-flow.tsx` 第 ⑤ 步「正式报名」中，把「自定义表单答案」textarea 替换为动态渲染：

- `event.customFormConfig` 解析成功且有 fields → 逐字段渲染控件，提交时组装 `{fieldId: value}` 后 `JSON.stringify` 传入现有 `form_answers` 参数（API/RPC 不动）；
- 解析失败 / 空 schema → 降级为现在的备注 textarea（答案存 `{notes: "..."}`），保证历史活动与脏数据不炸；
- 必填校验在前端做（空值阻断提交并滚动到该字段）；`phone`/`wechat` 为弱校验，只提示不阻断。

---

## 四、界面区块说明（v3 iOS 原生规范）

### A. 问题列表卡片（向导第 ⑤ 步内）

- 白卡 `#FFF`、圆角 14px、1px `#E5E5EA` 边框、无阴影；整组一张卡、行间 hairline——即 inset-grouped list。
- 区块标题「报名问题」：13px caption `#8E8E93` 大写间距样式，卡片外左上。
- 每问题行（高度 ≥44px，16px 内边距）：
  - 左：问题标题 15px/600 `#1C1C1E`；下行 13px `#8E8E93` 显示「类型 · 必填」；
  - 右：↑↓ 排序按钮（13px 灰色，44×44 点击区）+ chevron `›` `#AEAEB2`。
- 「＋ 添加问题」独占尾行：15px 强调色 `#A97A5B` 文本按钮，前置 `+`。
- 卡片下方 caption 行：「使用高级 JSON 模式」13px `#8E8E93`，右对齐。

### B. 问题编辑抽屉（sheet）

- 底部滑出（移动）/ 居中模态（桌面 ≥768px），白底、顶部圆角 14px、页面加半透明遮罩。
- 标题栏：17px/600「编辑问题」，右上「完成」强调色文字按钮。
- 类型选择：2×4 网格卡片（10px 圆角、灰底 `rgba(118,118,128,0.12)`，选中态强调色 1.5px 描边 + 强调色文字），每格 13px 标签。
- 输入区：inset-grouped 白卡——「问题标题」「占位提示」两行 input（15px）；
- 选项编辑（条件出现）：独立分组卡，每行 input + 右侧 `×`（`#AEAEB2`）；尾行「＋ 添加选项」强调色；少于 2 项时该行下方 13px 红色提示。
- 「必填」行：15px 标签 + 右侧 iOS switch（选中轨道 `#A97A5B`）。
- 「删除此问题」：独立分组、红色 15px 居中文本行（iOS destructive 样式），点击后行内二次确认（变为「确认删除？」+ 取消）。

### C. 参与者视角预览卡

- 桌面：编辑列表右侧固定栏（沿用 wizard-summary 位置逻辑，宽 ~320px）；移动：列表下方折叠区「预览参与者看到的表单」。
- 页面底 `#F2F2F7` 内嵌白卡模拟参与者报名页片段：13px caption 顶栏「参与者视角 · 实时预览」+ 动态渲染的只读表单。
- 空 schema 时显示 13px `#AEAEB2` 占位：「还没有报名问题，参与者只需填基础信息」。

### D. 高级 JSON 模式

- 同一卡片位置整体切换为：等宽字体 textarea（13px）+ 顶部 13px 警示条（灰底、`#8E8E93`）+ 底部两个按钮「格式化」（secondary）/「返回可视化编辑」（强调色）。
- 校验错误用 13px 红色 caption 逐条列在 textarea 下方。

### 间距

全部落 8pt 网格：卡片内边距 16px、卡片间 16px、区块间 32px、行高 44px 起、sheet 上下留白 24px。

---

## 五、实现拆步建议

| 步骤 | 内容 | 主要文件 | 预估 |
|---|---|---|---|
| 1. schema 类型与工具 | `FormSchema/FormField` TS 类型、`parseFormSchema()`（含容错降级）、`validateFormSchema()`（给 JSON 模式用）、`generateFieldId()` | 新增 `src/lib/form-schema.ts` | 0.5 天 |
| 2. 参与者端动态渲染器 | `<DynamicRegistrationForm>` 组件：7 类控件渲染、必填/弱校验、答案组装；替换 `registration-flow.tsx:524` 的 textarea，保留降级路径 | 新增 `src/components/dynamic-registration-form.tsx`；改 `registration-flow.tsx` | 1 天 |
| 3. 编辑器主体 | 问题列表卡 + 增删 + ↑↓ 排序 + 问题编辑 sheet（类型/标题/占位/选项/必填/删除） | 新增 `src/components/form-builder.tsx`（含 sheet 子组件）；样式进全局 CSS | 2 天 |
| 4. 实时预览 + JSON 模式 | 预览栏复用步骤 2 组件；JSON textarea 双向切换 + parse 校验报错 | `form-builder.tsx` 内 | 0.5 天 |
| 5. 接入创建向导 | 编辑器挂到第 ⑤ 步「报名订单」，从第 ⑥ 步移除旧 textarea；与 `form.customFormConfig` 字符串草稿双向同步；review 步摘要显示「N 个问题」 | 改 `src/app/organizer/events/new/page.tsx` | 0.5 天 |
| 6. 回归验证 | 老草稿恢复、脏 schema 降级、免费/收费两路报名提交、Excel 导出答案、演示模式本地发布 | tests + 手测 | 0.5 天 |

合计约 **5 人天**。风险点：
- 全局 CSS 体量与既有类名冲突（sheet、switch 是新组件模式，需新增样式段落）；
- `registration-flow.tsx` 同时被演示模式与真实模式使用，降级路径要两边验证；
- 后续若做管理台「编辑已发布活动的表单」，需另行考虑"已有答案 + schema 变更"的对齐问题（本期不做，仅创建向导）。
