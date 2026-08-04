import {
  eventAnnouncements,
  eventSetups,
  events,
  findEvent,
  getEventAnnouncements,
  getEventOrganizers,
  getEventSetup,
  type EventAnnouncement,
  type EventCategory,
  type EventOrganizer,
  type EventSetup,
  type EventStatus,
  type EventTemplate,
  type GatherEvent
} from "@/lib/mock-data";
import { reportDataAccessFailure, shouldUseMockData } from "@/lib/data-mode";
import { getActiveRegistrationCounts } from "@/lib/event-registration-counts";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type EventRow = {
  id: string;
  public_code: string;
  name: string;
  category: string;
  template: string;
  custom_type_label: string | null;
  city: string;
  venue_name: string;
  address: string | null;
  starts_at: string;
  registration_deadline: string | null;
  price_cents: number;
  custom_form_config: unknown;
  payment_code_img: string | null;
  wechat_group_img: string | null;
  capacity: number;
  accept_waitlist: boolean;
  description: string | null;
  status: string;
  allow_multi_person_registration: boolean;
  max_people_per_registration: number;
  order_number_prefix: string | null;
};

type AnnouncementRow = {
  id: string;
  event_id: string;
  title: string;
  body: string;
  status: string;
  published_at: string | null;
};

export type EventDetailData = {
  announcements: EventAnnouncement[];
  event: GatherEvent;
  organizers: EventOrganizer[];
  setup: EventSetup;
  source: "mock" | "supabase";
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "待确认";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  }).formatToParts(date);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${date.getFullYear()}-${partByType.get("month")}-${partByType.get("day")} ${partByType.get("hour")}:${partByType.get("minute")}`;
}

function mapCategory(value: string): EventCategory {
  const categories: Record<string, EventCategory> = {
    community: "同好活动",
    campus: "校园活动",
    conference: "会议会务",
    private: "好友聚会",
    private_gathering: "好友聚会",
    workshop: "工作坊",
    market: "快闪/市集"
  };

  return categories[value] ?? "同好活动";
}

function mapTemplate(value: string): EventTemplate {
  const templates: Record<string, EventTemplate> = {
    basic_registration: "基础报名",
    payment_registration: "报名收款",
    paid_registration: "报名收款",
    seating: "选座活动",
    checkin: "签到活动",
    check_in: "签到活动",
    time_slot_booking: "分时预约",
    record_only: "记录型聚会"
  };

  return templates[value] ?? "基础报名";
}

function mapStatus(value: string): EventStatus {
  const statuses: Record<string, EventStatus> = {
    draft: "草稿配置",
    interest_collecting: "数调中",
    registration_scheduled: "待开放报名",
    registration_open: "报名中",
    registration_closed: "即将截止",
    payment_reviewing: "付款确认中",
    seat_selection_scheduled: "已成团",
    seat_selection_open: "已成团",
    ready: "已成团",
    completed: "已结束",
    cancelled: "已结束"
  };

  return statuses[value] ?? "草稿配置";
}

function mapSetupStatus(status: string): EventSetup["setupStatus"] {
  if (status === "draft") return "草稿配置";
  if (status === "interest_collecting") return "数调中";
  if (status === "registration_scheduled") return "待开放报名";
  return "报名已开放";
}

export function eventRowToGatherEvent(row: EventRow, registeredCount = 0): GatherEvent {
  return {
    id: row.id,
    publicCode: row.public_code,
    name: row.name,
    category: mapCategory(row.category),
    template: mapTemplate(row.template),
    customTypeLabel: row.custom_type_label ?? "线下活动",
    city: row.city,
    venue: row.venue_name,
    address: row.address ?? "待确认",
    startsAt: formatDateTime(row.starts_at),
    deadline: formatDateTime(row.registration_deadline),
    price: Math.round(row.price_cents / 100),
    capacity: row.capacity,
    registered: registeredCount,
    paid: 0,
    seated: 0,
    status: mapStatus(row.status),
    allowMulti: row.allow_multi_person_registration,
    maxPeoplePerOrder: row.max_people_per_registration,
    acceptWaitlist: row.accept_waitlist,
    orderPrefix: row.order_number_prefix ?? row.public_code.replace(/^GU-/, "").slice(0, 8),
    customFormConfig: row.custom_form_config ?? {},
    paymentCodeImg: row.payment_code_img ?? undefined,
    wechatGroupImg: row.wechat_group_img ?? undefined,
    description: row.description ?? "活动详情由主办方补充。"
  };
}

export function eventRowToSetup(row: EventRow): EventSetup {
  return {
    eventId: row.id,
    setupStatus: mapSetupStatus(row.status),
    paymentQrStatus: row.price_cents > 0 ? "已配置" : "未配置",
    paymentMethod: "微信收款码",
    surveyOptions: [{ label: formatDateTime(row.starts_at), votes: 0, selected: true }],
    venueOptions: [{ label: row.venue_name, votes: 0, selected: true }],
    nextAction: row.status === "registration_open" ? "报名已开放，重点处理付款审核和参与者通知。" : "继续确认活动配置。"
  };
}

function announcementRowToEventAnnouncement(row: AnnouncementRow): EventAnnouncement {
  return {
    id: row.id,
    eventId: row.event_id,
    type: "报名通知",
    title: row.title,
    content: row.body,
    status: row.status === "published" ? "已发布" : "草稿",
    publishedAt: formatDateTime(row.published_at),
    audience: "全部参与者"
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function mockEventDetail(eventId: string): EventDetailData | null {
  const event = findEvent(eventId);

  if (!event) {
    return null;
  }

  return {
    announcements: getEventAnnouncements(eventId),
    event,
    organizers: getEventOrganizers(eventId),
    setup: getEventSetup(eventId),
    source: "mock"
  };
}

function fallbackEvents() {
  return events;
}

export async function getPublicEvents(): Promise<GatherEvent[]> {
  if (shouldUseMockData()) {
    return fallbackEvents();
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, custom_form_config, payment_code_img, wechat_group_img, capacity, accept_waitlist, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true });

    if (error) {
      reportDataAccessFailure("getPublicEvents", error);

      return [];
    }

    const rows = (data ?? []) as EventRow[];
    const registeredCounts = await getActiveRegistrationCounts(
      supabase,
      rows.map((row) => row.id)
    );

    return rows.map((row) => eventRowToGatherEvent(row, registeredCounts.get(row.id) ?? 0));
  } catch (error) {
    reportDataAccessFailure("getPublicEvents", error);

    return [];
  }
}

export async function getPublicEventDetail(eventId: string): Promise<EventDetailData | null> {
  if (shouldUseMockData()) {
    return mockEventDetail(eventId);
  }

  try {
    const supabase = getSupabaseServerClient();
    const eventQuery = supabase
      .from("events")
      .select("id, public_code, name, category, template, custom_type_label, city, venue_name, address, starts_at, registration_deadline, price_cents, custom_form_config, payment_code_img, wechat_group_img, capacity, accept_waitlist, description, status, allow_multi_person_registration, max_people_per_registration, order_number_prefix");
    const { data: eventData, error: eventError } = await (isUuid(eventId)
      ? eventQuery.eq("id", eventId).single()
      : eventQuery.eq("public_code", eventId).single());

    if (eventError || !eventData) {
      if (eventError && eventError.code !== "PGRST116") {
        reportDataAccessFailure("getPublicEventDetail", eventError);
      }

      return null;
    }

    const eventRow = eventData as EventRow;
    const registeredCounts = await getActiveRegistrationCounts(supabase, [eventRow.id]);
    const event = eventRowToGatherEvent(eventRow, registeredCounts.get(eventRow.id) ?? 0);
    const setup = eventRowToSetup(eventRow);
    const { data: announcementData } = await supabase
      .from("announcements")
      .select("id, event_id, title, body, status, published_at")
      .eq("event_id", event.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    return {
      announcements: (announcementData ?? []).map((row) => announcementRowToEventAnnouncement(row as AnnouncementRow)),
      event,
      organizers: [],
      setup,
      source: "supabase"
    };
  } catch (error) {
    reportDataAccessFailure("getPublicEventDetail", error);

    return null;
  }
}

export function getMockEventSetups() {
  return eventSetups;
}

export function getMockEventAnnouncements() {
  return eventAnnouncements;
}
