import { NextResponse } from "next/server";

import { asRecord, getNumber, getString, jsonError, normalizeJsonInput } from "@/lib/server/api";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const categoryMap: Record<string, string> = {
  同好活动: "community",
  校园活动: "campus",
  会议会务: "conference",
  好友聚会: "private",
  工作坊: "workshop",
  "快闪/市集": "market"
};

const templateMap: Record<string, string> = {
  基础报名: "basic_registration",
  报名收款: "payment_registration",
  选座活动: "seating",
  签到活动: "checkin",
  分时预约: "time_slot",
  记录型聚会: "record_only"
};

const feeModeMap: Record<string, string> = {
  免费活动: "free",
  收费活动: "paid",
  AA记账: "split"
};

function toIsoDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}:00+08:00`).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapEnum(value: string, values: Record<string, string>, fallback: string) {
  return values[value] ?? (value || fallback);
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    keyPrefix: "events:create",
    limit: 20,
    windowMs: 60_000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const authContext = await getAuthenticatedSupabaseClient(request);

  if (!authContext) {
    return jsonError("请使用 Supabase 登录后再创建真实活动。", 401);
  }

  let body: Record<string, unknown>;

  try {
    body = asRecord(await request.json());
  } catch {
    return jsonError("请求体不是合法 JSON。");
  }

  const eventInput = asRecord(body.event ?? body);
  const setupInput = asRecord(body.setup);
  const rulesInput = asRecord(body.rules);
  const publicCode = getString(eventInput, ["publicCode", "public_code"]).toUpperCase();

  if (!publicCode.startsWith("GU-")) {
    return jsonError("活动公开 ID 必须以 GU- 开头。");
  }

  try {
    const price = getNumber(rulesInput, ["price"], getNumber(eventInput, ["price"], 0));
    const allowMulti = rulesInput.allowMulti === true || rulesInput.allowMulti === "允许";
    const paymentCodeImg =
      getString(body, ["payment_code_img", "paymentCodeImg"]) ||
      getString(setupInput, ["payment_code_img", "paymentCodeImg", "paymentCodeUrl"]);
    const wechatGroupImg =
      getString(body, ["wechat_group_img", "wechatGroupImg"]) ||
      getString(setupInput, ["wechat_group_img", "wechatGroupImg"]);
    const customFormConfig = normalizeJsonInput(
      body.custom_form_config ?? body.customFormConfig ?? eventInput.custom_form_config ?? eventInput.customFormConfig
    );
    const { data, error } = await authContext.supabase.rpc("create_event_atomic", {
      p_public_code: publicCode,
      p_name: getString(eventInput, ["name"]) || "未命名活动",
      p_category: mapEnum(getString(eventInput, ["category"]), categoryMap, "community"),
      p_template: mapEnum(getString(eventInput, ["template"]), templateMap, "basic_registration"),
      p_custom_type_label: getString(eventInput, ["customTypeLabel", "custom_type_label"]) || null,
      p_city: getString(eventInput, ["city"]) || "待确认",
      p_venue_name: getString(eventInput, ["venue", "venueName", "venue_name"]) || "待确认",
      p_address: getString(eventInput, ["address"]) || null,
      p_starts_at: toIsoDateTime(getString(eventInput, ["startsAt", "starts_at"])),
      p_registration_deadline: toIsoDateTime(getString(eventInput, ["deadline", "registration_deadline"])),
      p_capacity: Math.max(1, getNumber(rulesInput, ["capacity"], getNumber(eventInput, ["capacity"], 1))),
      p_price_cents: Math.max(0, Math.round(price * 100)),
      p_description: getString(eventInput, ["description"]) || null,
      p_payment_instructions: getString(setupInput, ["paymentNote", "payment_note", "payment_instructions"]) || null,
      p_custom_form_config: customFormConfig,
      p_payment_code_img: paymentCodeImg || null,
      p_wechat_group_img: wechatGroupImg || null,
      p_allow_multi_person_registration: allowMulti,
      p_max_people_per_registration: allowMulti ? Math.max(2, getNumber(rulesInput, ["maxPeoplePerOrder"], 4)) : 1,
      p_order_number_prefix:
        getString(rulesInput, ["orderPrefix", "order_number_prefix"]) || publicCode.replace(/^GU-/, "").slice(0, 8),
      p_fee_mode: mapEnum(getString(rulesInput, ["feeMode"]), feeModeMap, price > 0 ? "paid" : "free"),
      p_settlement_rule: getString(rulesInput, ["settlementRule", "settlement_rule"]) || null,
      p_payment_method: getString(setupInput, ["paymentMethod", "payment_method"]) || "wechat"
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    const result = asRecord(data);

    if (result.success !== true) {
      const errorCode = typeof result.error_code === "string" ? result.error_code : "EVENT_CREATE_FAILED";
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        PROFILE_NOT_FOUND: 404,
        INVALID_PUBLIC_CODE: 400,
        INVALID_EVENT_NAME: 400,
        INVALID_EVENT_LIMITS: 400,
        INVALID_MULTI_PERSON_LIMIT: 400,
        INVALID_EVENT_INPUT: 400,
        PUBLIC_CODE_CONFLICT: 409
      };

      return NextResponse.json(
        {
          ok: false,
          error_code: errorCode,
          message: typeof result.message === "string" ? result.message : "活动创建失败。"
        },
        { status: statusMap[errorCode] ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      event_id: result.event_id,
      public_code: result.public_code,
      custom_form_config: result.custom_form_config,
      payment_code_img: result.payment_code_img
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "活动创建接口暂时不可用。", 500);
  }
}
