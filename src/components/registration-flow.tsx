"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FileImage,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  TicketCheck,
  UserRoundCog,
  UsersRound
} from "lucide-react";

import type { EventSetup, GatherEvent } from "@/lib/mock-data";
import { FormRenderer } from "@/components/form-renderer";
import { SeatMap } from "@/components/seat-map";
import {
  buildAnswersPayload,
  parseFormSchema,
  validateAnswers,
  type FormAnswers,
  type FormField
} from "@/lib/form-schema";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isNativePlatform } from "@/lib/mobile/env";
import { pickCompressedImage } from "@/lib/mobile/upload";

type RegistrationFlowProps = {
  event: GatherEvent;
  initialStep?: string;
  setup: EventSetup;
};

type FlowStep = "role" | "survey" | "location" | "locked" | "profile" | "payment" | "waiting" | "seat";

type CreatedOrder = {
  ok?: boolean;
  message?: string;
  order_id?: string;
  registration_id?: string;
  order_number?: string;
  payment_id?: string | null;
  event_id?: string;
  amount_due_cents?: number;
};

type WaitlistResult = {
  desired_quantity?: number;
  message?: string;
  ok?: boolean;
  priority_position?: number;
  status?: string;
  waitlist_entry_id?: string;
};

const flowSteps: Array<{ key: FlowStep; label: string }> = [
  { key: "role", label: "登录身份" },
  { key: "survey", label: "数调" },
  { key: "location", label: "地点投票" },
  { key: "locked", label: "等待开放" },
  { key: "profile", label: "报名" },
  { key: "payment", label: "付款确认" },
  { key: "seat", label: "选座/入场" }
];

const scheduleOptions = ["6月21日 周日 14:00", "6月22日 周一 19:30", "6月23日 周二 19:30"];
const baseLocationOptions = ["大光明电影院", "百美汇影城 静安店"];

function getInitialStep(step: string | undefined, canEnterRegistration: boolean): FlowStep {
  if (step === "survey" || step === "location" || step === "seat") {
    return step;
  }

  if (step === "profile" || step === "payment") {
    return canEnterRegistration ? step : "locked";
  }

  return "role";
}

export function RegistrationFlow({ event, initialStep, setup }: RegistrationFlowProps) {
  const [nickname, setNickname] = useState("比奇堡miki");
  const [contact, setContact] = useState("moirahoumiki@example.com");
  const [quantity, setQuantity] = useState(1);
  const [attendeeIds, setAttendeeIds] = useState(["GU-MIKI"]);
  const parsedFormSchema = useMemo(() => parseFormSchema(event.customFormConfig), [event.customFormConfig]);
  const formFields: FormField[] = useMemo(
    () => (parsedFormSchema.kind === "form" ? parsedFormSchema.schema.fields : []),
    [parsedFormSchema]
  );
  const [dynamicAnswers, setDynamicAnswers] = useState<FormAnswers>({});
  const [fallbackNote, setFallbackNote] = useState("");
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [answerWarnings, setAnswerWarnings] = useState<Record<string, string>>({});
  const [screenshotName, setScreenshotName] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState("");
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([scheduleOptions[1]]);
  const [selectedLocation, setSelectedLocation] = useState(event.venue);
  const [message, setMessage] = useState("");
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState("");
  const [isPickingNativeProof, setIsPickingNativeProof] = useState(false);

  const orderNumber = createdOrderNumber || `${event.orderPrefix}-0029`;
  const amount = event.price * quantity;
  const isFreeEvent = amount === 0;
  const registrationOpen = setup.setupStatus === "报名已开放";
  const paymentReady = isFreeEvent || setup.paymentQrStatus === "已配置";
  const canEnterRegistration = registrationOpen && paymentReady;
  const capacityFull = event.registered >= event.capacity;
  const canJoinWaitlist = registrationOpen && capacityFull && event.acceptWaitlist !== false;
  const [step, setStep] = useState<FlowStep>(() => getInitialStep(initialStep, canEnterRegistration));
  const participantStage = step === "locked"
    ? "已提交意向，等待报名开放"
    : step === "profile"
      ? "正式报名中，尚未付款"
      : step === "payment"
        ? "已生成订单，待上传付款截图"
        : step === "seat"
          ? "付款已确认，可以选座或查看入场信息"
        : step === "waiting"
          ? isFreeEvent ? "报名已提交，等待组织者确认" : "付款截图待审核"
          : "意向收集中，尚未占名额";

  const attendeeSlots = useMemo(() => {
    return Array.from({ length: quantity }, (_, index) => attendeeIds[index] ?? "");
  }, [attendeeIds, quantity]);
  const answersPayload = useMemo(() => {
    if (formFields.length > 0) {
      return buildAnswersPayload(formFields, dynamicAnswers);
    }

    return fallbackNote.trim() ? { notes: fallbackNote.trim() } : {};
  }, [dynamicAnswers, fallbackNote, formFields]);
  const answersFilled = Object.keys(answersPayload).length > 0;
  const locationOptions = useMemo(() => {
    return Array.from(new Set([event.venue, ...baseLocationOptions]));
  }, [event.venue]);

  function getProgressClass(targetStep: FlowStep) {
    const currentIndex = flowSteps.findIndex((item) => item.key === step);
    const targetIndex = flowSteps.findIndex((item) => item.key === targetStep);

    if (targetIndex === currentIndex) return "active";
    if (targetIndex < currentIndex || step === "waiting") return "done";
    return "";
  }

  function toggleSchedule(option: string) {
    setMessage("");
    setSelectedSchedules((current) =>
      current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    );
  }

  function updateQuantity(nextQuantity: number) {
    setQuantity(nextQuantity);
    setAttendeeIds((current) =>
      Array.from({ length: nextQuantity }, (_, index) => current[index] ?? (index === 0 ? "GU-MIKI" : ""))
    );
  }

  function updateAttendeeId(index: number, value: string) {
    setAttendeeIds((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function getSafeFileName(fileName: string) {
    const fallback = "payment-proof";
    const normalized = fileName.trim().replaceAll(/\s+/g, "-").replaceAll(/[^a-zA-Z0-9._-]/g, "");

    return normalized || fallback;
  }

  async function getAccessToken() {
    return isSupabaseConfigured()
      ? (await getSupabaseBrowserClient().auth.getSession()).data.session?.access_token
      : "";
  }

  async function createPendingOrder(): Promise<CreatedOrder | null> {
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMessage("订单已进入本地原型流程；真实数据库报名需要先使用 Supabase 账号登录。");
        return null;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          event_id: event.id,
          nickname,
          contact,
          quantity,
          form_answers: answersPayload
        })
      });
      const result = (await response.json()) as CreatedOrder;

      if (!response.ok || !result.ok) {
        setMessage(`订单已进入本地原型流程；数据库写入未完成：${result.message ?? "接口返回失败"}`);
        return null;
      }

      if (result.order_number) {
        setCreatedOrderNumber(result.order_number);
      }
      setMessage(`订单已提交，订单号：${result.order_number ?? "待生成"}`);
      return result;
    } catch {
      setMessage("订单已进入本地原型流程；当前无法连接报名接口，稍后可重试同步。");
      return null;
    }
  }

  async function submitPaymentProof(order: CreatedOrder, file: File) {
    const accessToken = await getAccessToken();
    const registrationId = order.registration_id || order.order_id || "";
    const paymentId = order.payment_id || "";
    const proofEventId = order.event_id || event.id;

    if (!accessToken || !registrationId || !paymentId) {
      setMessage("订单已生成，但缺少付款记录信息，暂时无法上传截图。");
      return false;
    }

    const storagePath = `${proofEventId}/${registrationId}/${paymentId}/${Date.now()}-${getSafeFileName(file.name)}`;
    const supabase = getSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setMessage(`订单已生成，但付款截图上传失败：${uploadError.message}`);
      return false;
    }

    const response = await fetch("/api/orders/payment-proof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        registration_id: registrationId,
        payment_id: paymentId,
        storage_path: storagePath,
        amount_reported_cents: order.amount_due_cents ?? amount * 100
      })
    });
    const result = (await response.json()) as { ok?: boolean; message?: string; order_number?: string };

    if (!response.ok || !result.ok) {
      setMessage(`截图已上传，但付款记录提交失败：${result.message ?? "接口返回失败"}`);
      return false;
    }

    if (result.order_number) {
      setCreatedOrderNumber(result.order_number);
    }
    setMessage(`付款截图已提交，订单号：${result.order_number ?? order.order_number ?? "待生成"}`);
    return true;
  }

  function submitSurvey() {
    if (selectedSchedules.length === 0) {
      setMessage("请至少选择一个你可以参加的时间。");
      return;
    }

    setMessage("");
    setStep("location");
  }

  function submitLocationVote() {
    if (!selectedLocation) {
      setMessage("请先选择一个偏好的活动地点。");
      return;
    }

    setMessage("");
    setStep(canEnterRegistration ? "profile" : "locked");
  }

  function updateDynamicAnswer(fieldId: string, value: string | string[]) {
    setDynamicAnswers((current) => ({ ...current, [fieldId]: value }));
    setAnswerErrors((current) => {
      if (!current[fieldId]) {
        return current;
      }

      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  function validateDynamicAnswers() {
    if (formFields.length === 0) {
      return true;
    }

    const { blocking, warnings } = validateAnswers(formFields, dynamicAnswers);
    setAnswerErrors(blocking);
    setAnswerWarnings(warnings);

    if (Object.keys(blocking).length > 0) {
      setMessage("还有必填问题没有填写，请补充后再提交。");
      return false;
    }

    return true;
  }

  async function submitProfile() {
    setMessage("");

    if (capacityFull) {
      setMessage(canJoinWaitlist ? "活动名额已满，请先加入候补。" : "活动名额已满，且主办方未开放候补。");
      return;
    }

    if (!validateDynamicAnswers()) {
      return;
    }

    if (isFreeEvent) {
      await createPendingOrder();
      setStep("waiting");
      return;
    }

    setStep("payment");
  }

  async function joinWaitlist() {
    setMessage("");
    setIsJoiningWaitlist(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        setMessage("真实候补需要先使用 Supabase 账号登录。");
        return;
      }

      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          event_id: event.id,
          desired_quantity: quantity,
          participant_note: answersFilled ? JSON.stringify(answersPayload) : ""
        })
      });
      const result = (await response.json().catch(() => ({}))) as WaitlistResult;

      if (!response.ok || !result.ok) {
        setMessage(result.message ?? "加入候补失败。");
        return;
      }

      setWaitlistStatus(`候补已提交，当前排序：${result.priority_position ?? "待计算"}`);
      setMessage("候补申请已提交；有名额释放时，主办方会发出转正邀请。");
      setStep("waiting");
    } catch {
      setMessage("候补接口暂时不可用，请稍后重试。");
    } finally {
      setIsJoiningWaitlist(false);
    }
  }

  async function submitPayment() {
    if (!screenshotName) {
      setMessage("请先选择付款截图，再提交给组织者确认。");
      return;
    }

    if (!paymentProofFile) {
      setMessage("请重新选择付款截图文件。");
      return;
    }

    const order = await createPendingOrder();

    if (!order) {
      return;
    }

    const proofSubmitted = await submitPaymentProof(order, paymentProofFile);

    if (proofSubmitted) {
      setStep("waiting");
    }
  }

  async function pickNativePaymentProof() {
    if (!isNativePlatform()) return;

    setIsPickingNativeProof(true);
    try {
      const file = await pickCompressedImage({ quality: 72, source: "prompt" });
      if (!file) {
        return;
      }
      setPaymentProofFile(file);
      setScreenshotName(file.name);
      setMessage("已选择移动端图片，可直接提交给组织者确认。");
    } catch {
      setMessage("调用系统相机/相册失败，请重试或改用网页文件选择。");
    } finally {
      setIsPickingNativeProof(false);
    }
  }

  return (
    <>
      <section className="page-header">
        <div>
          <p className="eyebrow">活动报名</p>
          <h1>{event.name}</h1>
          <p className="subtle">
            参与者需先登录并完成数调、地点投票；组织者确认时间、地点和收款配置后，才开放报名付款。
          </p>
        </div>
      </section>

      <section className="registration-layout">
        <article className="content-card">
          <div className="progress-rail" aria-label="报名进度">
            {flowSteps.map((item) => (
              <span className={getProgressClass(item.key)} key={item.key}>{item.label}</span>
            ))}
          </div>

          {step === "role" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>先确认你的身份</h2>
                  <p className="subtle">当前为模拟登录状态。真实版本中，同一 GatherUp ID 对同一活动只能提交一份数调和一份地点投票。</p>
                </div>
                <UserRoundCog size={22} />
              </div>

              <div className="choice-grid single">
                <button className="choice-card selected" type="button" onClick={() => setStep("survey")}>
                  <UsersRound size={20} />
                  <strong>已登录为参与者：GU-MIKI</strong>
                  <span>继续参与数调和地点投票。组织者入口不会从公开活动页进入。</span>
                </button>
              </div>

              <div className="guard-panel">
                <LockKeyhole size={18} />
                <span>防刷规则：登录后提交、每人一票、可修改但保留记录、异常重复提交进入审核。</span>
              </div>
            </div>
          )}

          {step === "survey" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>数调：选择可参加时间</h2>
                  <p className="subtle">这一步用于帮组织者确定最合适的活动时间。当前阶段不会生成订单，也不会发生付款。</p>
                </div>
                <CalendarCheck size={22} />
              </div>

              <div className="option-list">
                {scheduleOptions.map((option) => (
                  <button
                    className={`option-card ${selectedSchedules.includes(option) ? "selected" : ""}`}
                    key={option}
                    type="button"
                    onClick={() => toggleSchedule(option)}
                  >
                    <span>{option}</span>
                    <strong>{selectedSchedules.includes(option) ? "已选择" : "可选择"}</strong>
                  </button>
                ))}
              </div>

              <div className="guard-panel">
                <CalendarCheck size={18} />
                <span>截止前可修改，系统以后会保留最后一次提交和修改记录。当前提交只代表意向，不占名额。</span>
              </div>

              {message && <p className="validation-note">{message}</p>}

              <button className="button primary" type="button" onClick={submitSurvey}>
                提交数调，进入地点投票
              </button>
            </div>
          )}

          {step === "location" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>地点投票</h2>
                  <p className="subtle">参与者先投票表达偏好。组织者确认最终地点并开放报名后，才进入订单流程。</p>
                </div>
                <MapPinned size={22} />
              </div>

              <div className="option-list">
                {locationOptions.map((option) => (
                  <button
                    className={`option-card ${selectedLocation === option ? "selected" : ""}`}
                    key={option}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(option);
                      setMessage("");
                    }}
                  >
                    <span>{option}</span>
                    <strong>{selectedLocation === option ? "当前选择" : "投这一项"}</strong>
                  </button>
                ))}
              </div>

              <div className="guard-panel">
                <MapPinned size={18} />
                <span>地点投票不是最终场地确认。组织者定案后，你会收到报名开放提醒。</span>
              </div>

              {message && <p className="validation-note">{message}</p>}

              <button className="button primary" type="button" onClick={submitLocationVote}>
                提交地点偏好
              </button>
            </div>
          )}

          {step === "locked" && (
            <div className="flow-section success-panel">
              <LockKeyhole size={34} />
              <h2>已提交数调和地点偏好</h2>
              <p className="subtle">
                当前活动阶段为「{setup.setupStatus}」，收款配置为「{setup.paymentQrStatus}」。
                组织者确认时间、地点和收款二维码后，系统才会开放正式报名与付款截图上传。
              </p>
              <div className="state-summary">
                <strong>你现在的状态：已提交意向，但还没有正式报名，也没有占用名额。</strong>
                <span>报名开放后，系统会通过站内消息、微信/邮箱/手机号中的可用方式提醒你。</span>
              </div>
              <div className="guard-panel">
                <ShieldCheck size={18} />
                <span>这一步会阻止恶意用户提前占坑、提前付款或绕过组织者确认。</span>
              </div>
              <Link className="button secondary" href="/me">查看我的活动</Link>
            </div>
          )}

          {step === "profile" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>正式报名</h2>
                  <p className="subtle">数调和地点投票已完成，组织者已开放报名。提交后生成订单号，用于付款和名单核对。</p>
                </div>
                <TicketCheck size={22} />
              </div>

              <div className="state-summary">
                <strong>{capacityFull ? "当前活动名额已满。" : "你现在还没有付款，也还没有选座。"}</strong>
                <span>{capacityFull ? "如果主办方开放候补，你可以先加入候补队列，等待名额释放。" : "提交后会生成订单号；付款确认前不会开放选座。"}</span>
              </div>

              <div className="form-grid">
                <label>显示昵称<input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
                <label>联系方式<input value={contact} onChange={(event) => setContact(event.target.value)} /></label>
                <label>
                  报名人数
                  <select value={quantity} onChange={(event) => updateQuantity(Number(event.target.value))}>
                    {Array.from({ length: event.maxPeoplePerOrder }, (_, index) => index + 1).map((count) => (
                      <option disabled={!event.allowMulti && count > 1} key={count} value={count}>
                        {count} 人
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {formFields.length > 0 ? (
                <div className="dynamic-form-card">
                  <p className="dynamic-form-title">主办方想了解</p>
                  <FormRenderer
                    answers={dynamicAnswers}
                    errors={answerErrors}
                    fields={formFields}
                    warnings={answerWarnings}
                    onChange={updateDynamicAnswer}
                  />
                </div>
              ) : (
                <div className="form-grid">
                  <label className="wide-field">
                    给主办方的备注（选填）
                    <textarea
                      placeholder="例如：希望和同行坐一起"
                      rows={3}
                      value={fallbackNote}
                      onChange={(event) => setFallbackNote(event.target.value)}
                    />
                  </label>
                </div>
              )}

              <div className="attendee-list">
                {attendeeSlots.map((attendeeId, index) => (
                  <label className="inline-field" key={index}>
                    <span>{index === 0 ? "本人 GatherUp ID" : `同行人 ${index + 1} ID`}</span>
                    <input
                      value={attendeeId}
                      placeholder="例如 GU-MIKI"
                      onChange={(event) => updateAttendeeId(index, event.target.value)}
                    />
                  </label>
                ))}
              </div>

              <div className="guard-panel">
                <UsersRound size={18} />
                <span>{event.allowMulti ? `本活动允许多人报名，最多 ${event.maxPeoplePerOrder} 人。同行人需要填写 GatherUp ID，方便对账、选座和入场核验。` : "本活动不允许多人报名，每个订单固定 1 人。"}</span>
              </div>

              {capacityFull ? (
                <div className="notice-list">
                  <div>
                    <UsersRound size={16} />
                    {canJoinWaitlist ? "名额已满，但主办方接受候补。" : "名额已满，主办方暂未开放候补。"}
                  </div>
                  {canJoinWaitlist && (
                    <button className="button primary" type="button" disabled={isJoiningWaitlist} onClick={() => void joinWaitlist()}>
                      <ShieldCheck size={17} />
                      {isJoiningWaitlist ? "提交候补中" : "加入候补"}
                    </button>
                  )}
                </div>
              ) : (
                <button className="button primary" type="button" onClick={submitProfile}>
                  <ShieldCheck size={17} />
                  生成订单
                </button>
              )}
            </div>
          )}

          {step === "payment" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>上传付款截图</h2>
                  <p className="subtle">付款截图会绑定订单号。组织者确认后，才开放选座或签到。</p>
                </div>
                <CreditCard size={22} />
              </div>

              <dl className="summary-list">
                <div><dt>订单号</dt><dd>{orderNumber}</dd></div>
                <div><dt>付款金额</dt><dd>¥{amount}</dd></div>
                <div><dt>收款方式</dt><dd>{setup.paymentMethod}</dd></div>
                <div><dt>收款人</dt><dd>组织者：GatherUp 活动发起人</dd></div>
                <div><dt>付款备注</dt><dd>{orderNumber} + {nickname}</dd></div>
                <div><dt>预计确认</dt><dd>组织者通常在 24 小时内处理</dd></div>
              </dl>

              <div className="guard-panel">
                <CreditCard size={18} />
                <span>如果付款截图被驳回，组织者需要填写原因，你可以重新上传。活动取消时，退款规则会显示在订单详情页。</span>
              </div>

              <label className="upload-box">
                <FileImage size={24} />
                <strong>{screenshotName || "选择付款截图"}</strong>
                <span>支持上传微信、支付宝或银行转账截图。</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setPaymentProofFile(nextFile);
                    setScreenshotName(nextFile?.name ?? "");
                    setMessage(nextFile ? "已选择截图，可以提交给组织者确认。" : "");
                  }}
                />
              </label>

              {isNativePlatform() && (
                <button className="button secondary" type="button" disabled={isPickingNativeProof} onClick={() => void pickNativePaymentProof()}>
                  <FileImage size={17} />
                  {isPickingNativeProof ? "读取中…" : "从相机/相册选择"}
                </button>
              )}

              {message && <p className="validation-note">{message}</p>}

              <button
                className="button primary"
                type="button"
                onClick={submitPayment}
              >
                提交截图，等待确认
              </button>
            </div>
          )}

          {step === "waiting" && (
            <div className="flow-section success-panel">
              <CheckCircle2 size={34} />
              <h2>{isFreeEvent ? "报名已提交" : "付款截图已提交"}</h2>
              <p className="subtle">
                订单 {orderNumber} 已进入组织者确认队列。组织者确认付款后，系统才会开放选座或签到。
              </p>
              <div className="state-summary">
                <strong>{waitlistStatus || (isFreeEvent ? "你已提交报名，等待组织者确认。" : "你已提交付款截图，但付款尚未确认。")}</strong>
                <span>{waitlistStatus ? "收到候补邀请后，请按通知及时完成转正报名。" : "确认前不会开放选座；确认后订单详情页会显示下一步入口。"}</span>
              </div>
              <Link className="button secondary" href={`/me/orders/${orderNumber}`}>查看订单详情</Link>
            </div>
          )}

          {step === "seat" && (
            <div className="flow-section">
              <div className="section-heading">
                <div>
                  <h2>选座与入场信息</h2>
                  <p className="subtle">付款确认后才会开放此步骤。当前为原型座位图，用于验证参与者的下一步路径。</p>
                </div>
                <TicketCheck size={22} />
              </div>

              <div className="state-summary">
                <strong>订单已确认，可以选择座位。</strong>
                <span>正式版会校验订单人数、锁定座位，并在入场前生成核验凭证。</span>
              </div>

              <SeatMap />

              <dl className="summary-list">
                <div><dt>订单号</dt><dd>{orderNumber}</dd></div>
                <div><dt>活动时间</dt><dd>{event.startsAt}</dd></div>
                <div><dt>场地</dt><dd>{event.city} · {event.venue}</dd></div>
                <div><dt>入场核验</dt><dd>凭订单号和 GatherUp ID 核验</dd></div>
              </dl>
            </div>
          )}
        </article>

        <aside className="action-card">
          <h2>当前流程</h2>
          <dl className="summary-list">
            <div><dt>身份</dt><dd>{step === "role" ? "待确认" : "参与者"}</dd></div>
            <div><dt>参与状态</dt><dd>{participantStage}</dd></div>
            <div><dt>活动阶段</dt><dd>{setup.setupStatus}</dd></div>
            <div><dt>收款配置</dt><dd>{setup.paymentQrStatus}</dd></div>
            <div><dt>数调</dt><dd>{selectedSchedules.length ? `${selectedSchedules.length} 个可参加时间` : "未提交"}</dd></div>
            <div><dt>地点偏好</dt><dd>{selectedLocation || "未选择"}</dd></div>
            <div><dt>订单号</dt><dd>{orderNumber}</dd></div>
            <div><dt>报名人</dt><dd>{nickname || "未填写"}</dd></div>
                <div><dt>人数</dt><dd>{quantity} 人</dd></div>
                <div><dt>金额</dt><dd>{isFreeEvent ? "免费" : `¥${amount}`}</dd></div>
                <div><dt>表单答案</dt><dd>{answersFilled ? "已填写" : "未填写"}</dd></div>
                <div><dt>多人报名</dt><dd>{event.allowMulti ? `最多 ${event.maxPeoplePerOrder} 人` : "不支持"}</dd></div>
          </dl>
          <div className="notice-strip">
            <UsersRound size={16} />
            <span>只有正式报名并完成付款确认后，才算成功占位；数调和地点投票只是意向。</span>
          </div>
        </aside>
      </section>
    </>
  );
}
