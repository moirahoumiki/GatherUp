"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Link,
  MapPinned,
  MessageCircle,
  QrCode,
  ScanLine,
  WandSparkles,
  UsersRound
} from "lucide-react";

import { FormBuilder } from "@/components/form-builder";
import { parseFormSchema } from "@/lib/form-schema";
import { saveLocalCreatedEvent } from "@/lib/local-created-events";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const steps = [
  { id: "basic", label: "基础信息", icon: ClipboardList },
  { id: "organizers", label: "组织者", icon: UsersRound },
  { id: "venue", label: "场地数调", icon: MapPinned },
  { id: "finance", label: "费用财务", icon: CircleDollarSign },
  { id: "rules", label: "报名订单", icon: CalendarCheck },
  { id: "payment", label: "收款座位", icon: QrCode },
  { id: "review", label: "确认发布", icon: BadgeCheck }
] as const;

type StepId = (typeof steps)[number]["id"];

const draftStorageKey = "gatherup_event_draft_v0_1";
const draftSavedAtStorageKey = "gatherup_event_draft_saved_at_v0_1";

const initialForm = {
  name: "春季社团招新开放日",
  publicCode: "GU-CLUB-20260712",
  category: "校园活动",
  template: "签到活动",
  customTypeLabel: "校园招新",
  city: "广州",
  ownerId: "GU-MIKI",
  collaboratorIds: "GU-TSUKI, GU-LIME",
  collaboratorRole: "联合主办",
  venueSource: "从场地库选择",
  venueName: "岭南大学生活动中心",
  address: "广州市番禺区大学城",
  startsAt: "2026-07-12 10:00",
  surveyOne: "7月12日 周日 10:00",
  surveyTwo: "7月12日 周日 14:00",
  venueOptionOne: "大学生活动中心",
  venueOptionTwo: "图书馆报告厅",
  feeMode: "免费活动",
  price: "0",
  settlementRule: "免费活动只记录支出，便于社团或学校报销。",
  capacity: "300",
  deadline: "2026-07-10 22:00",
  allowMulti: "不允许",
  orderFormat: "{eventCode}-0001",
  orderPrefix: "CLUB",
  paymentMethod: "无需收款",
  paymentCodeImg: "",
  wechatGroupImg: "",
  paymentNote: "免费活动无需付款，报名成功后等待组织者确认。",
  customFormConfig: JSON.stringify(
    {
      fields: [
        { id: "notes", label: "报名备注", type: "textarea", required: false },
        { id: "arrival_time", label: "预计到达时间", type: "text", required: false }
      ]
    },
    null,
    2
  ),
  seatingMode: "不需要选座",
  rows: "0",
  seatsPerRow: "0",
  seatMapSource: "手动填写",
  description: "校园社团联合开放日，支持报名、名单、签到和活动通知。"
};

type EventDraftForm = typeof initialForm;

type PublishCheck = {
  label: string;
  detail: string;
  ok: boolean;
  step: StepId;
};

function buildDraftPayload(form: EventDraftForm) {
  const collaboratorIds = form.collaboratorIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return {
    event: {
      name: form.name.trim(),
      publicCode: form.publicCode.trim().toUpperCase(),
      category: form.category,
      template: form.template,
      customTypeLabel: form.customTypeLabel.trim(),
      city: form.city.trim(),
      venue: form.venueName.trim(),
      address: form.address.trim(),
      startsAt: form.startsAt.trim(),
      deadline: form.deadline.trim(),
      customFormConfig: form.customFormConfig.trim(),
      description: form.description.trim()
    },
    organizers: [
      { publicId: form.ownerId.trim().toUpperCase(), role: "主办" },
      ...collaboratorIds.map((publicId) => ({
        publicId: publicId.toUpperCase(),
        role: form.collaboratorRole
      }))
    ],
    setup: {
      surveyOptions: [form.surveyOne, form.surveyTwo].map((label) => label.trim()).filter(Boolean),
      venueOptions: [form.venueOptionOne, form.venueOptionTwo].map((label) => label.trim()).filter(Boolean),
      venueSource: form.venueSource,
      paymentMethod: form.paymentMethod,
      paymentCodeImg: form.paymentCodeImg.trim(),
      wechatGroupImg: form.wechatGroupImg.trim(),
      paymentNote: form.paymentNote.trim(),
      seatingMode: form.seatingMode,
      seatMapSource: form.seatMapSource,
      rows: Number(form.rows) || 0,
      seatsPerRow: Number(form.seatsPerRow) || 0
    },
    rules: {
      feeMode: form.feeMode,
      price: Number(form.price) || 0,
      settlementRule: form.settlementRule.trim(),
      capacity: Number(form.capacity) || 0,
      allowMulti: form.allowMulti === "允许",
      orderFormat: form.orderFormat,
      orderPrefix: form.orderPrefix.trim().toUpperCase()
    }
  };
}

function isPositiveNumber(value: string) {
  return Number(value) > 0;
}

function hasText(value: string) {
  return value.trim().length > 0;
}

function buildPublishChecks(form: EventDraftForm): PublishCheck[] {
  const isPaidEvent = form.feeMode !== "免费活动";
  const needsSeatConfig = form.seatingMode !== "不需要选座";
  const usesCustomOrderPrefix = form.orderFormat === "自定义前缀 + 流水号";

  return [
    {
      label: "活动基础信息",
      detail: "活动名称、公开 ID、城市和活动说明都需要填写。",
      ok: hasText(form.name) && form.publicCode.trim().startsWith("GU-") && hasText(form.city) && hasText(form.description),
      step: "basic"
    },
    {
      label: "组织者身份",
      detail: "主办 GatherUp ID 需要以 GU- 开头，便于后续权限绑定。",
      ok: form.ownerId.trim().toUpperCase().startsWith("GU-"),
      step: "organizers"
    },
    {
      label: "时间和场地",
      detail: "场地、地址、活动时间、至少一个数调选项和地点选项都需要准备好。",
      ok:
        hasText(form.venueName) &&
        hasText(form.address) &&
        hasText(form.startsAt) &&
        [form.surveyOne, form.surveyTwo].some(hasText) &&
        [form.venueOptionOne, form.venueOptionTwo].some(hasText),
      step: "venue"
    },
    {
      label: "费用和结算",
      detail: "收费或 AA 活动需要大于 0 的金额；所有活动都需要结算说明。",
      ok: hasText(form.settlementRule) && (!isPaidEvent || isPositiveNumber(form.price)),
      step: "finance"
    },
    {
      label: "报名和订单规则",
      detail: "人数上限、截止时间和订单编号规则需要可生成；自定义前缀时必须填写前缀。",
      ok: isPositiveNumber(form.capacity) && hasText(form.deadline) && (!usesCustomOrderPrefix || hasText(form.orderPrefix)),
      step: "rules"
    },
    {
      label: "收款和选座",
      detail: "收费活动需要收款方式和付款说明；需要选座时要有排数和每排座位数。",
      ok:
        (!isPaidEvent || (form.paymentMethod !== "无需收款" && hasText(form.paymentNote))) &&
        (!needsSeatConfig || (isPositiveNumber(form.rows) && isPositiveNumber(form.seatsPerRow))),
      step: "payment"
    }
  ];
}

function buildLocalCreatedEvent(form: EventDraftForm) {
  const draftPayload = buildDraftPayload(form);
  const safeCode = draftPayload.event.publicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id: `local-${safeCode || Date.now()}`,
    publicCode: draftPayload.event.publicCode,
    name: draftPayload.event.name,
    category: draftPayload.event.category,
    template: draftPayload.event.template,
    customTypeLabel: draftPayload.event.customTypeLabel,
    city: draftPayload.event.city,
    venue: draftPayload.event.venue,
    startsAt: draftPayload.event.startsAt,
    deadline: draftPayload.event.deadline,
    feeMode: draftPayload.rules.feeMode,
    price: draftPayload.rules.price,
    capacity: draftPayload.rules.capacity,
    paymentMethod: draftPayload.setup.paymentMethod,
    paymentCodeImg: draftPayload.setup.paymentCodeImg,
    wechatGroupImg: draftPayload.setup.wechatGroupImg,
    seatingMode: draftPayload.setup.seatingMode,
    organizerIds: draftPayload.organizers.map((organizer) => organizer.publicId),
    setupStatus: "发布检查通过" as const,
    updatedAt: new Date().toISOString()
  };
}

export default function NewEventPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<StepId>("basic");
  const [form, setForm] = useState(initialForm);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [seatImageName, setSeatImageName] = useState("");
  const [seatRecognitionStatus, setSeatRecognitionStatus] = useState("上传影厅座位截图后，可以先自动识别，再人工微调排数、座位数和不可选座位。");
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const activeStepMeta = steps[activeIndex];
  const ActiveStepIcon = activeStepMeta.icon;
  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === steps.length - 1;

  const summary = useMemo(() => {
    const parsedForm = parseFormSchema(form.customFormConfig);
    const questionCount = parsedForm.kind === "form" ? parsedForm.schema.fields.length : 0;

    return [
      ["活动 ID", form.publicCode],
      ["活动类型", `${form.category} · ${form.template}`],
      ["场地", `${form.city} · ${form.venueName}`],
      ["费用模式", form.feeMode],
      ["报名人数", `${form.capacity} 人`],
      ["多人报名", form.allowMulti],
      ["报名问题", questionCount > 0 ? `${questionCount} 个问题` : form.customFormConfig.trim() ? "已配置（JSON）" : "未配置"],
      ["收款码", form.paymentCodeImg.trim() ? "已配置" : "未配置"],
      ["微信群码", form.wechatGroupImg.trim() ? "审核通过后展示" : "未配置"],
      ["座位", form.seatingMode]
    ];
  }, [form]);
  const draftPayload = useMemo(() => buildDraftPayload(form), [form]);
  const publishChecks = useMemo(() => buildPublishChecks(form), [form]);
  const publishIssueCount = publishChecks.filter((item) => !item.ok).length;
  const canPublish = publishIssueCount === 0;

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftStorageKey);
    const savedAt = window.localStorage.getItem(draftSavedAtStorageKey);

    if (savedDraft) {
      try {
        setForm({ ...initialForm, ...(JSON.parse(savedDraft) as Partial<EventDraftForm>) });
        setDraftNotice(savedAt ? `已恢复 ${savedAt} 保存的草稿。` : "已恢复上次保存的草稿。");
      } catch {
        setDraftNotice("草稿读取失败，已使用默认示例继续。");
      }
    }

    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    window.localStorage.setItem(draftStorageKey, JSON.stringify(form));
  }, [form, hasLoadedDraft]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const surveyLink = `https://gatherup.app/e/${form.publicCode}/survey`;
  const groupAnnouncement = `【${form.name}】数调开始啦：请打开链接填写可参加时间和地点偏好，后续报名、付款和选座都在同一个活动页完成。${surveyLink}`;

  async function copySurveyText() {
    const text = groupAnnouncement;

    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
    } catch {
      setShareCopied(false);
    }
  }

  function recognizeSeatMap() {
    updateField("rows", "6");
    updateField("seatsPerRow", "12");
    updateField("seatMapSource", "截图自动识别");
    setSeatRecognitionStatus("已生成一个 6 排 x 12 座的识别草稿。下一版会继续识别过道、空座和不可售座位；现在可以先手动调整。");
  }

  function goToPreviousStep() {
    if (!isFirstStep) {
      setActiveStep(steps[activeIndex - 1].id);
    }
  }

  function goToNextStep() {
    if (!isLastStep) {
      setActiveStep(steps[activeIndex + 1].id);
    }
  }

  function saveDraft() {
    const savedAt = new Date().toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    window.localStorage.setItem(draftStorageKey, JSON.stringify(form));
    window.localStorage.setItem(draftSavedAtStorageKey, savedAt);
    setDraftNotice(`草稿已保存，保存时间：${savedAt}。`);
  }

  async function publishEvent() {
    if (!canPublish) {
      const firstIssue = publishChecks.find((item) => !item.ok);
      if (firstIssue) {
        setActiveStep(firstIssue.step);
      }
      setDraftNotice(`还有 ${publishIssueCount} 项发布前检查需要处理。`);
      return;
    }

    saveDraft();

    if (!isSupabaseConfigured()) {
      const localEvent = buildLocalCreatedEvent(form);
      saveLocalCreatedEvent(localEvent);
      setDraftNotice("本地演示模式：发布检查已通过，活动已保存到这台浏览器。配置 Supabase 后会写入真实活动表。");
      return;
    }

    setIsPublishing(true);
    setDraftNotice("正在写入 Supabase 活动表...");

    try {
      const accessToken = (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token;

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          ...draftPayload,
          custom_form_config: form.customFormConfig,
          payment_code_img: form.paymentCodeImg,
          wechat_group_img: form.wechatGroupImg
        })
      });
      const result = (await response.json()) as { ok?: boolean; event_id?: string; message?: string };

      if (response.ok && result.ok && result.event_id) {
        window.localStorage.removeItem(draftStorageKey);
        window.localStorage.removeItem(draftSavedAtStorageKey);
        setDraftNotice(`活动已写入 Supabase：${result.event_id}。正在打开管理台...`);
        router.push(`/organizer/events/${result.event_id}`);
        router.refresh();
        return;
      }

      setDraftNotice(`数据库写入未完成：${result.message ?? "接口返回失败"}`);
    } catch {
      setDraftNotice("当前无法连接活动创建接口，稍后可重试发布。");
    } finally {
      setIsPublishing(false);
    }
  }

  function resetDraft() {
    window.localStorage.removeItem(draftStorageKey);
    window.localStorage.removeItem(draftSavedAtStorageKey);
    setForm(initialForm);
    setDraftNotice("已清空本地草稿，并恢复默认示例。");
  }

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">创建活动</p>
          <h1>按步骤创建一场活动</h1>
          <p className="subtle">先完成组织者、场地、财务、报名和收款配置，再发布给参与者。</p>
        </div>
      </section>

      <section className="wizard-layout">
        <aside className="wizard-steps" aria-label="创建活动步骤">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.id === activeStep;
            const isDone = index < activeIndex;

            return (
              <button
                aria-current={isActive ? "step" : undefined}
                className={`wizard-step-button ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
              >
                <StepIcon size={17} />
                <span>{step.label}</span>
              </button>
            );
          })}
        </aside>

        <article className="content-card wizard-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">第 {activeIndex + 1} 步</p>
              <h2>{activeStepMeta.label}</h2>
            </div>
            <ActiveStepIcon size={22} />
          </div>

          {draftNotice && <p className="inline-notice">{draftNotice}</p>}

          {activeStep === "basic" && (
            <div className="form-grid two-column">
              <label>活动名称<input value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
              <label>活动公开 ID<input value={form.publicCode} onChange={(event) => updateField("publicCode", event.target.value)} /></label>
              <label>活动场景<select value={form.category} onChange={(event) => updateField("category", event.target.value)}><option>同好活动</option><option>校园活动</option><option>会议会务</option><option>好友聚会</option><option>工作坊</option><option>快闪/市集</option></select></label>
              <label>流程模板<select value={form.template} onChange={(event) => updateField("template", event.target.value)}><option>基础报名</option><option>报名收款</option><option>选座活动</option><option>签到活动</option><option>分时预约</option><option>记录型聚会</option></select></label>
              <label>细分标签<input value={form.customTypeLabel} onChange={(event) => updateField("customTypeLabel", event.target.value)} /></label>
              <label>城市<input value={form.city} onChange={(event) => updateField("city", event.target.value)} /></label>
              <label className="wide-field">活动说明<input value={form.description} onChange={(event) => updateField("description", event.target.value)} /></label>
            </div>
          )}

          {activeStep === "organizers" && (
            <div className="form-grid two-column">
              <label>主办 GatherUp ID<input value={form.ownerId} onChange={(event) => updateField("ownerId", event.target.value)} /></label>
              <label>协作组织者<input value={form.collaboratorIds} onChange={(event) => updateField("collaboratorIds", event.target.value)} /></label>
              <label>默认协作权限<select value={form.collaboratorRole} onChange={(event) => updateField("collaboratorRole", event.target.value)}><option>联合主办</option><option>财务</option><option>现场协作</option><option>只读</option></select></label>
              <label>活动身份展示<select defaultValue="show"><option value="show">展示组织者 GatherUp ID</option><option value="hide">仅展示组织名</option></select></label>
            </div>
          )}

          {activeStep === "venue" && (
            <>
              <div className="share-kit">
                <div>
                  <p className="eyebrow">数调发布方式</p>
                  <h3>给组织者一个可直接发进群里的入口</h3>
                  <p className="subtle">第一版同时保留链接、二维码和群公告文案。微信群、QQ群、邮件、社群公告都能用同一个入口。</p>
                </div>
                <div className="share-grid">
                  <button className="share-card" type="button" onClick={copySurveyText}>
                    <MessageCircle size={18} />
                    <span>复制群公告</span>
                    <small>{shareCopied ? "已复制" : "适合微信群/QQ群"}</small>
                  </button>
                  <button className="share-card" type="button" onClick={copySurveyText}>
                    <Link size={18} />
                    <span>复制数调链接</span>
                    <small>{form.publicCode}/survey</small>
                  </button>
                  <button className="share-card" type="button" onClick={() => setQrGenerated(true)}>
                    <QrCode size={18} />
                    <span>{qrGenerated ? "二维码已生成" : "生成二维码"}</span>
                    <small>{qrGenerated ? form.publicCode : "适合海报和线下扫码"}</small>
                  </button>
                </div>
                {qrGenerated && (
                  <div className="qr-preview" aria-label="数调二维码预览">
                    <QrCode size={58} />
                    <span>{form.publicCode}</span>
                  </div>
                )}
              </div>
              <div className="form-grid two-column">
                <label>地点来源<select value={form.venueSource} onChange={(event) => updateField("venueSource", event.target.value)}><option>从场地库选择</option><option>手动填写新地点</option></select></label>
                <label>场地名称<input value={form.venueName} onChange={(event) => updateField("venueName", event.target.value)} /></label>
                <label className="wide-field">地址<input value={form.address} onChange={(event) => updateField("address", event.target.value)} /></label>
                <label>日期和时间<input value={form.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} /></label>
                <label>数调选项 1<input value={form.surveyOne} onChange={(event) => updateField("surveyOne", event.target.value)} /></label>
                <label>数调选项 2<input value={form.surveyTwo} onChange={(event) => updateField("surveyTwo", event.target.value)} /></label>
                <label>地点选项 1<input value={form.venueOptionOne} onChange={(event) => updateField("venueOptionOne", event.target.value)} /></label>
                <label>地点选项 2<input value={form.venueOptionTwo} onChange={(event) => updateField("venueOptionTwo", event.target.value)} /></label>
              </div>
            </>
          )}

          {activeStep === "finance" && (
            <div className="form-grid two-column">
              <label>费用模式<select value={form.feeMode} onChange={(event) => updateField("feeMode", event.target.value)}><option>免费活动</option><option>收费活动</option><option>AA记账</option></select></label>
              <label>单人费用<input value={form.price} onChange={(event) => updateField("price", event.target.value)} /></label>
              <label className="wide-field">结算规则<input value={form.settlementRule} onChange={(event) => updateField("settlementRule", event.target.value)} /></label>
              <label>首笔支出分类<select defaultValue="场地费"><option>场地费</option><option>物料采购</option><option>餐饮茶歇</option><option>设备租赁</option><option>交通快递</option><option>宣传设计</option><option>其他</option></select></label>
              <label>首笔支出预算<input defaultValue="0" /></label>
            </div>
          )}

          {activeStep === "rules" && (
            <>
              <div className="form-grid two-column">
                <label>活动人数上限<input value={form.capacity} onChange={(event) => updateField("capacity", event.target.value)} /></label>
                <label>报名截止时间<input value={form.deadline} onChange={(event) => updateField("deadline", event.target.value)} /></label>
                <label>多人报名<select value={form.allowMulti} onChange={(event) => updateField("allowMulti", event.target.value)}><option>不允许</option><option>允许</option></select></label>
                <label>每单最多人数<input defaultValue="1" /></label>
                <label>订单编号<select value={form.orderFormat} onChange={(event) => updateField("orderFormat", event.target.value)}><option>{"{eventCode}-0001"}</option><option>GU-0001</option><option>{"{eventCode}-{YYYYMMDD}-0001"}</option><option>自定义前缀 + 流水号</option></select></label>
                <label>候补名单<select defaultValue="accept"><option value="accept">接受候补</option><option value="deny">不接受候补</option></select></label>
                {form.orderFormat === "自定义前缀 + 流水号" && (
                  <>
                    <label>自定义前缀<input value={form.orderPrefix} onChange={(event) => updateField("orderPrefix", event.target.value.toUpperCase())} /></label>
                    <label>编号预览<input readOnly value={`${form.orderPrefix || "GU"}-0001`} /></label>
                  </>
                )}
              </div>
              {hasLoadedDraft && (
                <FormBuilder
                  value={form.customFormConfig}
                  onChange={(nextValue) => updateField("customFormConfig", nextValue)}
                />
              )}
            </>
          )}

          {activeStep === "payment" && (
            <div className="form-grid two-column">
              <label>收款方式<select value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value)}><option>无需收款</option><option>微信收款码</option><option>支付宝收款码</option><option>银行转账</option></select></label>
              <label>收款码图片链接<input value={form.paymentCodeImg} onChange={(event) => updateField("paymentCodeImg", event.target.value)} placeholder="https://.../payment-code.png" /></label>
              <label>微信群二维码链接<input value={form.wechatGroupImg} onChange={(event) => updateField("wechatGroupImg", event.target.value)} placeholder="https://.../wechat-group.png" /></label>
              <label className="wide-field">付款说明<input value={form.paymentNote} onChange={(event) => updateField("paymentNote", event.target.value)} /></label>
              <label>座位模式<select value={form.seatingMode} onChange={(event) => updateField("seatingMode", event.target.value)}><option>不需要选座</option><option>付款确认后选座</option><option>组织者手动分配</option></select></label>
              <label>座位图来源<select value={form.seatMapSource} onChange={(event) => updateField("seatMapSource", event.target.value)}><option>手动填写</option><option>截图自动识别</option><option>复用场地库座位图</option></select></label>
              <div className="seat-import-card wide-field">
                <div>
                  <ScanLine size={20} />
                  <strong>从影院/场馆座位截图识别</strong>
                  <p>{seatRecognitionStatus}</p>
                  {seatImageName && <small>已选择：{seatImageName}</small>}
                </div>
                <label className="file-button">
                  选择截图
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        setSeatImageName(file.name);
                        updateField("seatMapSource", "截图自动识别");
                      }
                    }}
                  />
                </label>
                <button className="button secondary compact" type="button" onClick={recognizeSeatMap}>
                  <WandSparkles size={16} />
                  自动识别草稿
                </button>
              </div>
              <label>排数<input value={form.rows} onChange={(event) => updateField("rows", event.target.value)} /></label>
              <label>每排座位<input value={form.seatsPerRow} onChange={(event) => updateField("seatsPerRow", event.target.value)} /></label>
              <label className="wide-field">手动调整说明<input defaultValue="例如：A1-A2 不开放；C5-C6 预留；中间过道在 6、7 号之间。" /></label>
            </div>
          )}

          {activeStep === "review" && (
            <>
              <section className={`publish-readiness ${canPublish ? "ready" : "blocked"}`}>
                <div className="section-heading">
                  <div>
                    <h3>发布前检查</h3>
                    <p className="subtle">
                      {canPublish ? "所有关键配置都已就绪，可以进入数据库发布环节。" : `还有 ${publishIssueCount} 项需要处理，避免活动发布后再返工。`}
                    </p>
                  </div>
                  {canPublish ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="publish-check-list">
                  {publishChecks.map((check) => (
                    <button
                      className={`publish-check-row ${check.ok ? "ok" : "needs-work"}`}
                      key={check.label}
                      type="button"
                      onClick={() => setActiveStep(check.step)}
                    >
                      {check.ok ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                      <span>
                        <strong>{check.label}</strong>
                        <small>{check.detail}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
              <div className="review-grid">
                {summary.map(([label, value]) => (
                  <div className="result-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="draft-payload-preview">
                <strong>草稿数据预览</strong>
                <pre>{JSON.stringify(draftPayload, null, 2)}</pre>
              </div>
            </>
          )}

          <div className="wizard-actions">
            <button className="button secondary" disabled={isFirstStep} type="button" onClick={goToPreviousStep}>
              <ChevronLeft size={17} />
              上一步
            </button>
            <button className="button primary" type="button" onClick={isLastStep ? saveDraft : goToNextStep}>
              {isLastStep ? "保存草稿" : "下一步"}
              {!isLastStep && <ChevronRight size={17} />}
            </button>
            {isLastStep && (
              <button className="button primary" disabled={isPublishing} type="button" onClick={publishEvent}>
                {isPublishing ? "创建中" : "创建真实活动"}
              </button>
            )}
          </div>
        </article>

        <aside className="action-card wizard-summary">
          <h2>活动摘要</h2>
          <dl className="summary-list">
            {summary.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <button className="button secondary full" type="button" onClick={resetDraft}>
            清空本地草稿
          </button>
        </aside>
      </section>
    </>
  );
}
