import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function readSource(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function expectSource(source: string, needle: string) {
  assert.ok(source.includes(needle), `Expected source to include: ${needle}`);
}

function listApiRouteFiles(dir = join(repoRoot, "src/app/api")): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        return listApiRouteFiles(path);
      }

      return entry === "route.ts" ? [path] : [];
    })
    .sort();
}

describe("registration and payment proof API contracts", () => {
  const eventRoute = readSource("src/app/api/events/route.ts");
  const eventOrganizerRoute = readSource("src/app/api/events/organizers/route.ts");
  const eventOrganizerRespondRoute = readSource("src/app/api/events/organizers/respond/route.ts");
  const eventPublishRoute = readSource("src/app/api/events/publish/route.ts");
  const eventUpdateRoute = readSource("src/app/api/events/update/route.ts");
  const orderRoute = readSource("src/app/api/orders/route.ts");
  const paymentProofRoute = readSource("src/app/api/orders/payment-proof/route.ts");
  const paymentReviewRoute = readSource("src/app/api/orders/review/route.ts");
  const orderRefundRoute = readSource("src/app/api/orders/refund/route.ts");
  const orderRefundConfirmRoute = readSource("src/app/api/orders/refund/confirm/route.ts");
  const orderRefundDisputeRoute = readSource("src/app/api/orders/refund/dispute/route.ts");
  const orderRefundReviewRoute = readSource("src/app/api/orders/refund/review/route.ts");
  const orderRefundProofRoute = readSource("src/app/api/orders/refund/proof/route.ts");
  const expenseProofRoute = readSource("src/app/api/expenses/proof/route.ts");
  const orderVerifyRoute = readSource("src/app/api/orders/verify/route.ts");
  const exportAttendeesRoute = readSource("src/app/api/export/attendees/route.ts");
  const exportFinanceRoute = readSource("src/app/api/export/finance/route.ts");
  const devStatusRoute = readSource("src/app/api/dev/status/route.ts");
  const seatLockRoute = readSource("src/app/api/seats/lock/route.ts");
  const seatConfirmRoute = readSource("src/app/api/seats/confirm/route.ts");
  const waitlistRoute = readSource("src/app/api/waitlist/route.ts");
  const waitlistConvertRoute = readSource("src/app/api/waitlist/convert/route.ts");
  const waitlistInviteRoute = readSource("src/app/api/waitlist/invite/route.ts");
  const announcementPublishRoute = readSource("src/app/api/announcements/route.ts");
  const expenseRoute = readSource("src/app/api/expenses/route.ts");
  const notificationRoute = readSource("src/app/api/notifications/route.ts");
  const adminEventReviewRoute = readSource("src/app/api/admin/event-reviews/route.ts");
  const adminOrganizerVerificationRoute = readSource("src/app/api/admin/organizer-verifications/route.ts");
  const adminPage = readSource("src/app/admin/page.tsx");
  const adminEventReviewPanel = readSource("src/components/admin-event-review-panel.tsx");
  const adminVerificationReviewPanel = readSource("src/components/admin-verification-review-panel.tsx");
  const serverAdmin = readSource("src/lib/server/admin.ts");
  const organizerVerificationRoute = readSource("src/app/api/organizer/verification/route.ts");
  const appShell = readSource("src/components/app-shell.tsx");
  const notificationBell = readSource("src/components/notification-bell.tsx");
  const checkInPanel = readSource("src/components/check-in-panel.tsx");
  const orderSeatSelectionPanel = readSource("src/components/order-seat-selection-panel.tsx");
  const participantOrderActions = readSource("src/components/participant-order-actions.tsx");
  const refundReviewPanel = readSource("src/components/refund-review-panel.tsx");
  const waitlistInvitationActions = readSource("src/components/waitlist-invitation-actions.tsx");
  const waitlistPanel = readSource("src/components/waitlist-panel.tsx");
  const orderPage = readSource("src/app/me/orders/[orderNumber]/page.tsx");
  const myOrdersPage = readSource("src/app/me/page.tsx");
  const organizerPage = readSource("src/app/organizer/page.tsx");
  const organizerEventPage = readSource("src/app/organizer/events/[eventId]/page.tsx");
  const organizerFinancePage = readSource("src/app/organizer/events/[eventId]/finance/page.tsx");
  const organizerNewEventPage = readSource("src/app/organizer/events/new/page.tsx");
  const organizerDashboardMetrics = readSource("src/domain/organizer-dashboard-metrics.ts");
  const organizerEventActions = readSource("src/components/organizer-event-actions.tsx");
  const organizerVerificationPanel = readSource("src/components/organizer-verification-panel.tsx");
  const eventIdentityPanel = readSource("src/components/event-identity-panel.tsx");
  const eventBasicsEditor = readSource("src/components/event-basics-editor.tsx");
  const registerPage = readSource("src/app/events/[eventId]/register/page.tsx");
  const devStatusPage = readSource("src/app/dev/status/page.tsx");
  const registrationFlow = readSource("src/components/registration-flow.tsx");
  const announcementCenter = readSource("src/components/announcement-center.tsx");
  const auditLogTimeline = readSource("src/components/audit-log-timeline.tsx");
  const expenseLedger = readSource("src/components/expense-ledger.tsx");
  const expenseProofList = readSource("src/components/expense-proof-list.tsx");
  const eventsData = readSource("src/lib/events-data.ts");
  const eventRegistrationCounts = readSource("src/lib/event-registration-counts.ts");
  const organizerData = readSource("src/lib/organizer-data.ts");
  const ordersData = readSource("src/lib/orders-data.ts");
  const dataMode = readSource("src/lib/data-mode.ts");
  const serverApi = readSource("src/lib/server/api.ts");
  const supabaseServer = readSource("src/lib/supabase/server.ts");
  const eventService = readSource("src/lib/services/event.service.ts");
  const orderService = readSource("src/lib/services/order.service.ts");
  const refundService = readSource("src/lib/services/refund.service.ts");
  const waitlistService = readSource("src/lib/services/waitlist.service.ts");
  const notificationService = readSource("src/lib/services/notification.service.ts");
  const adminReviewService = readSource("src/lib/services/admin-review.service.ts");
  const exportService = readSource("src/lib/services/export.service.ts");
  const expenseService = readSource("src/lib/services/expense.service.ts");

  it("keeps route authentication unified across Bearer and Supabase SSR cookie sessions", () => {
    expectSource(supabaseServer, "export async function getAuthenticatedUser(request: Request)");
    expectSource(supabaseServer, "export async function getAuthenticatedSupabaseClient(request: Request)");
    expectSource(supabaseServer, "verifySupabaseAccessToken(accessToken)");
    expectSource(supabaseServer, "getSupabaseUserClient(accessToken)");
    expectSource(supabaseServer, "createSupabaseServerClient()");
    expectSource(supabaseServer, "supabase.auth.getUser()");
  });

  it("keeps mock data behind explicit local or demo mode only", () => {
    expectSource(dataMode, 'process.env.NEXT_PUBLIC_GATHERUP_DEMO_MODE === "1"');
    expectSource(dataMode, "return !isSupabaseConfigured() || isDemoModeEnabled()");
    expectSource(dataMode, "console.error(`[gatherup:data] ${scope} failed`, error)");

    for (const source of [eventsData, ordersData, organizerData]) {
      expectSource(source, 'from "@/lib/data-mode"');
      expectSource(source, "shouldUseMockData()");
      assert.doesNotMatch(source, /if \(!isSupabaseConfigured\(\)\)/);
    }

    expectSource(eventsData, 'reportDataAccessFailure("getPublicEvents", error)');
    expectSource(eventsData, 'reportDataAccessFailure("getPublicEventDetail", eventError)');
    expectSource(eventsData, 'reportDataAccessFailure("getPublicEventDetail", error)');
    assert.doesNotMatch(eventsData, /catch \([^)]*\)\s*{\s*return fallbackEvents\(\);/);
    assert.doesNotMatch(eventsData, /eventError \|\| !eventData\) {\s*return mockEventDetail/);

    expectSource(ordersData, 'reportDataAccessFailure("getOrderDetail", registrationError)');
    expectSource(ordersData, 'reportDataAccessFailure("getOrderDetail", eventError)');
    expectSource(ordersData, 'reportDataAccessFailure("getOrderDetail", error)');
    assert.doesNotMatch(ordersData, /catch \([^)]*\)\s*{\s*return mockOrderDetail/);
    assert.doesNotMatch(ordersData, /registrationError \|\| !registrationData\) {\s*return mockOrderDetail/);
    assert.doesNotMatch(ordersData, /eventError \|\| !eventData\) {\s*return mockOrderDetail/);
  });

  // Vercel Cron invokes this route directly with a `CRON_SECRET` bearer token
  // instead of a user session, so it is intentionally exempt from the
  // user-auth and mutating-rate-limit contracts enforced below.
  const cronOnlyRoutes = new Set(["src/app/api/jobs/run/route.ts"]);

  it("requires every mutating API route to enforce rate limiting", () => {
    const mutatingRoutePattern = /export async function (POST|PATCH|PUT|DELETE)\s*\(/;
    const mutatingRoutes = listApiRouteFiles()
      .map((file) => ({ file: relative(repoRoot, file), source: readFileSync(file, "utf8") }))
      .filter(({ file, source }) => mutatingRoutePattern.test(source) && !cronOnlyRoutes.has(file));

    assert.ok(mutatingRoutes.length > 0, "Expected at least one mutating API route.");

    for (const { file, source } of mutatingRoutes) {
      assert.ok(
        source.includes("enforceRateLimit(request"),
        `${file} must call enforceRateLimit(request) before mutating work.`
      );
      assert.ok(
        source.includes('from "@/lib/server/rate-limit"'),
        `${file} must import the shared server rate limiter.`
      );
    }
  });

  it("requires every API route to authenticate inside its route handler", () => {
    const apiRoutes = listApiRouteFiles()
      .map((file) => ({
        file: relative(repoRoot, file),
        source: readFileSync(file, "utf8")
      }))
      .filter(({ file }) => !cronOnlyRoutes.has(file));

    assert.ok(apiRoutes.length > 0, "Expected at least one API route.");

    for (const { file, source } of apiRoutes) {
      assert.match(
        source,
        /getAuthenticated(User|SupabaseClient)\(request\)|requirePlatformAdmin\(request\)/,
        `${file} must authenticate the request or require a platform admin because middleware intentionally lets /api routes reach their handlers.`
      );
      assert.ok(
        source.includes('from "@/lib/supabase/server"') || source.includes('from "@/lib/server/admin"'),
        `${file} must use shared Supabase auth helpers instead of local cookie/session parsing.`
      );
    }
  });

  it("keeps the cron job endpoint authenticated with a service-role secret and RPC-only cleanup", () => {
    const cronRoute = readSource("src/app/api/jobs/run/route.ts");

    expectSource(cronRoute, "process.env.CRON_SECRET");
    expectSource(cronRoute, "authorization === `Bearer ${cronSecret}`");
    expectSource(cronRoute, "getSupabaseServiceClient");
    expectSource(cronRoute, 'supabase.rpc("expire_seat_locks_for_event")');
    expectSource(cronRoute, 'supabase.rpc("expire_waitlist_invitations")');
    assert.doesNotMatch(cronRoute, /\.from\(/);
  });

  it("keeps order creation on the authenticated Supabase atomic registration RPC path", () => {
    expectSource(orderRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRoute, "enforceRateLimit(request");
    expectSource(orderRoute, 'keyPrefix: "orders:create"');
    expectSource(orderRoute, 'authContext.supabase.rpc("create_registration_atomic"');
    expectSource(orderRoute, "payment_id: payment?.id ?? null");

    assert.doesNotMatch(orderRoute, /payment_screenshot_img:\s*paymentScreenshotImg/);
    assert.doesNotMatch(orderRoute, /from\("payment_proofs"\)\.insert/);
  });

  it("keeps event creation atomic, authenticated, and rate limited", () => {
    expectSource(eventRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventRoute, "enforceRateLimit(request");
    expectSource(eventRoute, 'keyPrefix: "events:create"');
    expectSource(eventRoute, 'authContext.supabase.rpc("create_event_atomic"');
    expectSource(eventRoute, "p_public_code: publicCode");
    expectSource(eventRoute, "p_custom_form_config: customFormConfig");
    expectSource(eventRoute, "p_payment_code_img: paymentCodeImg || null");
    expectSource(eventRoute, "PUBLIC_CODE_CONFLICT: 409");

    assert.doesNotMatch(eventRoute, /getSupabaseServiceClient|getAuthenticatedUser/);
    assert.doesNotMatch(
      eventRoute,
      /\.from\("(events|event_organizers|event_finance_settings|collection_code_versions)"\)/
    );
  });

  it("keeps the organizer event creation wizard on the real Supabase create path", () => {
    expectSource(organizerNewEventPage, 'fetch("/api/events"');
    expectSource(organizerNewEventPage, "getSupabaseBrowserClient().auth.getSession()");
    expectSource(organizerNewEventPage, "router.push(`/organizer/events/${result.event_id}`)");
    expectSource(organizerNewEventPage, "本地演示模式");
    assert.doesNotMatch(organizerNewEventPage, /模拟发布检查/);
    assert.doesNotMatch(organizerNewEventPage, /本地活动记录已生成/);
  });

  it("keeps event publishing on an authenticated edit-permission API path", () => {
    expectSource(eventPublishRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventPublishRoute, "enforceRateLimit(request");
    expectSource(eventPublishRoute, 'keyPrefix: "events:publish"');
    expectSource(eventPublishRoute, 'from "@/lib/services"');
    expectSource(eventPublishRoute, "publishEventFromRequestBody");
    expectSource(eventPublishRoute, "return publishEventFromRequestBody(body, authContext)");

    expectSource(eventService, "canEditEvent(authContext.supabase, eventId)");
    expectSource(eventService, '.select("id, organizer_id, price_cents, payment_code_img, review_status")');
    expectSource(eventService, "paidEventVerificationStatuses.includes(String(verification.status))");
    expectSource(eventService, "verification.force_review_required === true");
    expectSource(eventService, "收费活动需要主办方完成认证");
    expectSource(eventService, 'status: "registration_open"');

    expectSource(organizerEventPage, "status={event.status}");
    expectSource(organizerEventActions, 'fetch("/api/events/publish"');
    expectSource(organizerEventActions, 'status === "草稿配置"');
  });

  it("keeps organizer event basics editing on an authenticated edit-permission API path", () => {
    expectSource(eventUpdateRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventUpdateRoute, "enforceRateLimit(request");
    expectSource(eventUpdateRoute, 'keyPrefix: "events:update"');
    expectSource(eventUpdateRoute, "updateEventFromRequestBody");
    expectSource(eventUpdateRoute, "return updateEventFromRequestBody(body, authContext)");

    expectSource(eventService, "canEditEvent(authContext.supabase, eventId)");
    expectSource(eventService, '.not("status", "in", "(cancelled,expired,refunded)")');
    expectSource(eventService, "capacity < activeRegistrationCount");
    expectSource(eventService, "reviewSensitiveStatuses");
    expectSource(eventService, "reviewSensitiveChanges");
    expectSource(eventService, '.from("review_requests")');
    expectSource(eventService, "review_required: requiresReview");

    expectSource(organizerEventPage, "<EventBasicsEditor event={event} />");
    expectSource(eventBasicsEditor, 'fetch("/api/events/update"');
    expectSource(eventBasicsEditor, "getSupabaseBrowserClient()");
    expectSource(eventBasicsEditor, "supabase.auth.getSession()");
    expectSource(eventBasicsEditor, "关键变更已提交平台复审");
  });

  it("keeps organizer collaborator management on the authenticated atomic RPC path", () => {
    expectSource(eventOrganizerRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventOrganizerRoute, "enforceRateLimit(request");
    expectSource(eventOrganizerRoute, 'keyPrefix: "events:organizers"');
    expectSource(eventOrganizerRoute, "manageEventOrganizerFromRequestBody");
    expectSource(eventOrganizerRoute, "return manageEventOrganizerFromRequestBody");
    expectSource(eventOrganizerRoute, "export async function DELETE(request: Request)");
    expectSource(eventOrganizerRoute, "export async function PATCH(request: Request)");
    expectSource(eventService, 'authContext.supabase.rpc("manage_event_organizer_atomic"');
    expectSource(eventService, "p_action: action");
    expectSource(eventService, "p_permissions: permissions");
    expectSource(eventService, "p_user_agent: userAgent");
    assert.doesNotMatch(eventOrganizerRoute, /owner:\s*"owner"/);
    assert.doesNotMatch(eventOrganizerRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(eventOrganizerRoute, /\.from\("event_organizers"\)/);
    assert.doesNotMatch(eventOrganizerRoute, /\.from\("audit_logs"\)/);

    expectSource(eventIdentityPanel, 'fetch("/api/events/organizers"');
    expectSource(eventIdentityPanel, 'method: "DELETE"');
    expectSource(eventIdentityPanel, 'method: "PATCH"');
    expectSource(eventIdentityPanel, "getSupabaseBrowserClient()");
    expectSource(eventIdentityPanel, "supabase.auth.getSession()");
    expectSource(eventIdentityPanel, "can_manage_payments");
    expectSource(eventIdentityPanel, 'organizer.role === "主办"');
    expectSource(eventIdentityPanel, 'className="compact-select"');
    expectSource(eventIdentityPanel, "organizerStatusLabel");
  });

  it("keeps collaborator invitation responses on the authenticated atomic RPC path", () => {
    expectSource(eventOrganizerRespondRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(eventOrganizerRespondRoute, "enforceRateLimit(request");
    expectSource(eventOrganizerRespondRoute, 'keyPrefix: "events:organizers-respond"');
    expectSource(eventOrganizerRespondRoute, "respondEventOrganizerInviteFromRequestBody");
    expectSource(eventService, 'authContext.supabase.rpc("respond_event_organizer_invitation_atomic"');
    expectSource(eventService, "p_event_id: eventId");
    expectSource(eventService, "p_response: response");
    assert.doesNotMatch(eventOrganizerRespondRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(eventOrganizerRespondRoute, /\.from\("event_organizers"\)/);
    assert.doesNotMatch(eventOrganizerRespondRoute, /\.from\("audit_logs"\)/);
  });

  it("keeps participant payment proof submission gated by identity and order ownership", () => {
    expectSource(paymentProofRoute, "getAuthenticatedUser(request)");
    expectSource(paymentProofRoute, "enforceRateLimit(request");
    expectSource(paymentProofRoute, 'keyPrefix: "orders:payment-proof"');
    expectSource(paymentProofRoute, "submitPaymentProofFromRequestBody");
    expectSource(orderService, "findUserByAuthUserId(supabase, authUser.id)");
    expectSource(orderService, "registration.user_id !== appUser.id");
    expectSource(orderService, '.eq("registration_id", registration.id)');
    expectSource(orderService, 'from("payment_proofs").insert');
  });

  it("keeps organizer payment review on the authenticated Supabase RPC path", () => {
    expectSource(paymentReviewRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(paymentReviewRoute, "enforceRateLimit(request");
    expectSource(paymentReviewRoute, 'keyPrefix: "orders:review"');
    expectSource(paymentReviewRoute, "reviewOrderPaymentFromRequestBody");
    expectSource(orderService, 'authContext.supabase.rpc("review_payment_atomic"');
    expectSource(orderService, "p_registration_id: isUuid(orderId) ? orderId : null");
    expectSource(orderService, "p_order_number: isUuid(orderId) ? null : orderId");

    assert.doesNotMatch(paymentReviewRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("payments"\)\s*\n\s*\.update/);
    assert.doesNotMatch(paymentReviewRoute, /\.from\("payment_proofs"\)\s*\n\s*\.update/);
  });

  it("keeps order check-in on the authenticated Supabase RPC path", () => {
    expectSource(orderVerifyRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderVerifyRoute, "enforceRateLimit(request");
    expectSource(orderVerifyRoute, 'keyPrefix: "orders:verify"');
    expectSource(orderVerifyRoute, "verifyOrderFromRequestBody");
    expectSource(orderService, 'typeof body.order_number === "string"');
    expectSource(orderService, '.from("registrations")');
    expectSource(orderService, '.select("check_in_code")');
    expectSource(orderService, '.eq("order_number", submittedOrderNumber)');
    expectSource(orderService, 'authContext.supabase.rpc("check_in_order_atomic"');
    expectSource(orderService, "p_check_in_code: checkInCode");
    expectSource(orderService, "attendee_count");

    assert.doesNotMatch(orderVerifyRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderVerifyRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderVerifyRoute, /\.from\("registration_attendees"\)\s*\n\s*\.update/);
  });

  it("keeps export authorization on the database permission helper", () => {
    expectSource(serverApi, "export async function canManageEvent(supabase: SupabaseClient, eventId: string)");
    expectSource(serverApi, 'supabase.rpc("can_manage_event"');
    expectSource(serverApi, "target_event_id: eventId");
    expectSource(serverApi, "export async function canManageEventFinance(supabase: SupabaseClient, eventId: string)");
    expectSource(serverApi, 'supabase.rpc("can_manage_event_finance"');
    assert.doesNotMatch(serverApi, /export async function canManageEvent[\s\S]*?\.from\("event_organizers"\)/);

    for (const route of [exportAttendeesRoute, exportFinanceRoute]) {
      expectSource(route, "getAuthenticatedSupabaseClient(request)");
      expectSource(route, 'from "@/lib/services"');
      assert.doesNotMatch(route, /canManageEventByAuthUserId/);
    }

    expectSource(exportAttendeesRoute, "return exportAttendees(eventId, authContext)");
    expectSource(exportFinanceRoute, "return exportFinance(eventId, authContext)");
    expectSource(exportService, "canManageEvent(authContext.supabase, event.id)");
    expectSource(exportService, "canManageEventFinance(authContext.supabase, event.id)");
  });

  it("keeps dev status checks authenticated and read-only", () => {
    expectSource(devStatusRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(devStatusRoute, "getSupabaseServiceClient()");
    expectSource(devStatusRoute, 'select("id", { head: true, count: "exact" })');
    expectSource(devStatusRoute, "SUPABASE_SERVICE_ROLE_KEY");
    expectSource(devStatusPage, 'fetch("/api/dev/status"');
    expectSource(devStatusPage, "ServerHealthResponse");
    expectSource(devStatusPage, "服务端 Supabase Health");

    assert.doesNotMatch(devStatusRoute, /SUPABASE_SERVICE_ROLE_KEY[^\\n]*:/);
    assert.doesNotMatch(devStatusRoute, /\.insert\(/);
    assert.doesNotMatch(devStatusRoute, /\.update\(/);
    assert.doesNotMatch(devStatusRoute, /\.delete\(/);
  });

  it("keeps participant refund requests on the authenticated Supabase RPC path", () => {
    expectSource(orderRefundRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundRoute, "enforceRateLimit(request");
    expectSource(orderRefundRoute, 'keyPrefix: "orders:refund"');
    expectSource(orderRefundRoute, "requestRefundFromRequestBody");
    expectSource(refundService, 'getString(body, ["order_number", "orderNumber"])');
    expectSource(refundService, '.from("registrations")');
    expectSource(refundService, '.select("id")');
    expectSource(refundService, '.eq("order_number", orderNumber)');
    expectSource(refundService, 'authContext.supabase.rpc("request_refund_atomic"');
    expectSource(refundService, "p_registration_id: registrationId");
    expectSource(refundService, "p_reason: reason");
    expectSource(participantOrderActions, 'fetch("/api/orders/refund"');
    expectSource(participantOrderActions, "order_number: registration.orderNumber");
    expectSource(participantOrderActions, "reason");

    assert.doesNotMatch(orderRefundRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundRoute, /\.from\("refund_requests"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(orderRefundRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps organizer refund review on the authenticated Supabase RPC path", () => {
    expectSource(orderRefundReviewRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundReviewRoute, "enforceRateLimit(request");
    expectSource(orderRefundReviewRoute, 'keyPrefix: "orders:refund-review"');
    expectSource(orderRefundReviewRoute, "reviewRefundFromRequestBody");
    expectSource(refundService, 'authContext.supabase.rpc("review_refund_request_atomic"');
    expectSource(refundService, "p_refund_request_id: refundRequestId");
    expectSource(refundService, "p_decision: decision");
    expectSource(refundReviewPanel, 'fetch("/api/orders/refund/review"');
    expectSource(refundReviewPanel, 'result === "APPROVED"');

    assert.doesNotMatch(orderRefundReviewRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundReviewRoute, /\.from\("refund_requests"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundReviewRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundReviewRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps organizer refund proof upload bound to the private Storage path and RPC", () => {
    expectSource(orderRefundProofRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundProofRoute, "enforceRateLimit(request");
    expectSource(orderRefundProofRoute, 'keyPrefix: "orders:refund-proof"');
    expectSource(orderRefundProofRoute, "uploadRefundProofFromRequestBody");
    expectSource(refundService, 'replace(/^refund-proofs\\//, "")');
    expectSource(refundService, "pathMatchesRefundProof(storagePath, eventId, refundRequest.id)");
    expectSource(refundService, '.schema("storage")');
    expectSource(refundService, '.from("objects")');
    expectSource(refundService, '.eq("bucket_id", "refund-proofs")');
    expectSource(refundService, '.eq("name", storagePath)');
    expectSource(refundService, 'authContext.supabase.rpc("record_refund_proof_atomic"');
    expectSource(refundService, "p_refund_request_id: refundRequestId");
    expectSource(refundService, "p_file_url: storagePath");
    expectSource(refundReviewPanel, '.from("refund-proofs")');
    expectSource(refundReviewPanel, 'fetch("/api/orders/refund/proof"');
    expectSource(refundReviewPanel, "refund_request_id: refundRequest.id");
    expectSource(refundReviewPanel, "storage_path: storagePath");

    assert.doesNotMatch(orderRefundProofRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("refund_proofs"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("refund_requests"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundProofRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps participant refund receipt confirmation on the authenticated Supabase RPC path", () => {
    expectSource(orderRefundConfirmRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundConfirmRoute, "enforceRateLimit(request");
    expectSource(orderRefundConfirmRoute, 'keyPrefix: "orders:refund-confirm"');
    expectSource(orderRefundConfirmRoute, "confirmRefundReceiptFromRequestBody");
    expectSource(refundService, 'authContext.supabase.rpc("confirm_refund_receipt_atomic"');
    expectSource(refundService, "p_refund_request_id: refundRequestId");
    expectSource(refundService, "p_decision: decision");
    expectSource(participantOrderActions, 'fetch("/api/orders/refund/confirm"');
    expectSource(participantOrderActions, "refund_request_id: refundRequest.id");
    expectSource(participantOrderActions, 'confirmRefundReceipt("CONFIRMED")');
    expectSource(participantOrderActions, 'confirmRefundReceipt("DISPUTED")');
    expectSource(ordersData, '.from("refund_requests")');
    expectSource(ordersData, "refund_proofs(file_url, amount_cents, uploaded_at)");
    expectSource(orderPage, "refundRequest.status");
    expectSource(
      orderPage,
      "<ParticipantOrderActions eventId={event.id} refundRequest={refundRequest} registration={registration} />"
    );

    assert.doesNotMatch(orderRefundConfirmRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundConfirmRoute, /\.from\("refund_requests"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundConfirmRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundConfirmRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps organizer refund dispute resolution on the authenticated Supabase RPC path", () => {
    expectSource(orderRefundDisputeRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(orderRefundDisputeRoute, "enforceRateLimit(request");
    expectSource(orderRefundDisputeRoute, 'keyPrefix: "orders:refund-dispute"');
    expectSource(orderRefundDisputeRoute, "resolveRefundDisputeFromRequestBody");
    expectSource(refundService, 'authContext.supabase.rpc("resolve_refund_dispute_atomic"');
    expectSource(refundService, "p_refund_request_id: refundRequestId");
    expectSource(refundService, "p_resolution: resolution");
    expectSource(refundReviewPanel, 'fetch("/api/orders/refund/dispute"');
    expectSource(refundReviewPanel, 'resolveDispute(refundRequest, "CONFIRM_REFUNDED")');
    expectSource(refundReviewPanel, 'resolveDispute(refundRequest, "REOPEN_PROOF")');

    assert.doesNotMatch(orderRefundDisputeRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(orderRefundDisputeRoute, /\.from\("refund_requests"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundDisputeRoute, /\.from\("registrations"\)\s*\n\s*\.update/);
    assert.doesNotMatch(orderRefundDisputeRoute, /\.from\("payments"\)\s*\n\s*\.update/);
  });

  it("keeps payment proof files bound to the private Storage object path", () => {
    expectSource(orderService, 'replace(/^payment-proofs\\//, "")');
    expectSource(orderService, "pathMatchesProof(storagePath, registration.event_id, registration.id, payment.id)");
    expectSource(orderService, '.schema("storage")');
    expectSource(orderService, '.from("objects")');
    expectSource(orderService, '.eq("bucket_id", "payment-proofs")');
    expectSource(orderService, '.eq("name", storagePath)');
    expectSource(orderService, "找不到已上传的付款截图文件");
  });

  it("keeps the browser upload aligned with the Storage RLS path contract", () => {
    expectSource(registrationFlow, '.from("payment-proofs")');
    expectSource(registrationFlow, ".upload(storagePath, file");
    expectSource(
      registrationFlow,
      "`${proofEventId}/${registrationId}/${paymentId}/${Date.now()}-${getSafeFileName(file.name)}`"
    );
    expectSource(registrationFlow, 'fetch("/api/orders/payment-proof"');
    expectSource(registrationFlow, "Authorization: `Bearer ${accessToken}`");
  });

  it("keeps the registration page on the shared Supabase public event detail adapter", () => {
    expectSource(registerPage, 'import { getPublicEventDetail } from "@/lib/events-data";');
    expectSource(registerPage, "await getPublicEventDetail(eventId)");
    expectSource(registerPage, "eventDetail.event");
    expectSource(registerPage, "eventDetail.setup");
    expectSource(eventsData, 'private: "好友聚会"');
    expectSource(eventsData, 'payment_registration: "报名收款"');
    expectSource(eventsData, 'checkin: "签到活动"');

    assert.doesNotMatch(registerPage, /findEvent|getEventSetup|@\/lib\/mock-data/);
  });

  it("keeps the participant order list on the authenticated Supabase orders adapter", () => {
    expectSource(myOrdersPage, 'import { getMyOrders } from "@/lib/orders-data";');
    expectSource(myOrdersPage, "await getMyOrders()");
    expectSource(myOrdersPage, "eventsById.get(registration.eventId)");
    expectSource(myOrdersPage, "registrations.length === 0");
    expectSource(ordersData, "export async function getMyOrders()");
    expectSource(ordersData, "await createSupabaseServerClient()");
    expectSource(ordersData, "await supabase.auth.getUser()");
    expectSource(ordersData, "findUserByAuthUserId(supabase, user.id)");
    expectSource(ordersData, '.eq("user_id", appUser.id)');
    expectSource(ordersData, "function emptySupabaseMyOrders()");

    assert.doesNotMatch(myOrdersPage, /@\/lib\/mock-data|events,\s*registrations/);
  });

  it("keeps the organizer dashboard on the authenticated Supabase organizer adapter", () => {
    expectSource(organizerPage, 'import { getOrganizerDashboard } from "@/lib/organizer-data";');
    expectSource(
      organizerPage,
      'import { buildOrganizerDashboardMetrics } from "@/domain/organizer-dashboard-metrics";'
    );
    expectSource(
      organizerPage,
      'import { OrganizerVerificationPanel } from "@/components/organizer-verification-panel";'
    );
    expectSource(organizerPage, "await getOrganizerDashboard()");
    expectSource(organizerPage, "buildOrganizerDashboardMetrics(events, eventSetups, registrations)");
    expectSource(organizerPage, "<OrganizerVerificationPanel />");
    expectSource(organizerPage, 'label="签到率"');
    expectSource(organizerPage, "退款风险单");
    expectSource(organizerPage, "选座进度");
    expectSource(organizerPage, 'label="已确认收入"');
    expectSource(organizerPage, "organizersByEventId.get(event.id)");
    expectSource(organizerPage, 'href="/organizer/events/new"');
    expectSource(organizerData, "export async function getOrganizerDashboard()");
    expectSource(organizerData, "await createSupabaseServerClient()");
    expectSource(organizerData, "await supabase.auth.getUser()");
    expectSource(organizerData, "findUserByAuthUserId(supabase, user.id)");
    expectSource(organizerData, '.from("event_organizers")');
    expectSource(organizerData, '.eq("user_id", appUser.id)');
    expectSource(organizerData, '.eq("status", "active")');
    expectSource(organizerData, '.eq("organizer_id", appUser.id)');
    expectSource(organizerData, "eventRowToGatherEvent(row)");
    expectSource(organizerData, "rowToRegistration");
    expectSource(organizerDashboardMetrics, "export function buildOrganizerDashboardMetrics");
    expectSource(organizerDashboardMetrics, "checkInRatePercent");
    expectSource(organizerDashboardMetrics, "refundExposureCount");
    expectSource(organizerDashboardMetrics, "seatingProgressPercent");

    assert.doesNotMatch(organizerPage, /import\s+\{[^}]*eventSetups|import\s+\{[^}]*registrations|getEventOrganizers/);
  });

  it("does not disguise organizer dashboard read failures as an empty workspace", () => {
    expectSource(organizerData, 'import { reportDataAccessFailure, shouldUseMockData } from "@/lib/data-mode";');
    expectSource(organizerData, 'status: "empty" | "error" | "ready";');
    expectSource(organizerData, "function failedSupabaseOrganizerDashboard");
    expectSource(organizerData, "reportDataAccessFailure(`getOrganizerDashboard:${scope}`, error)");
    expectSource(organizerData, 'return emptySupabaseOrganizerDashboard("error", errorMessage);');
    expectSource(organizerData, "catch (error)");
    expectSource(organizerPage, 'if (status === "error")');
    expectSource(organizerPage, 'export const dynamic = "force-dynamic";');
    expectSource(organizerPage, 'role="alert"');
    expectSource(organizerPage, "暂时无法显示主办工作台");
    expectSource(organizerPage, "重新加载");

    assert.doesNotMatch(organizerData, /catch\s*\{\s*return emptySupabaseOrganizerDashboard\(\);\s*\}/);
  });

  it("keeps organizer verification applications on an authenticated Supabase path", () => {
    expectSource(organizerVerificationRoute, "export async function GET(request: Request)");
    expectSource(organizerVerificationRoute, "export async function POST(request: Request)");
    expectSource(organizerVerificationRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(organizerVerificationRoute, "enforceRateLimit(request");
    expectSource(organizerVerificationRoute, 'keyPrefix: "organizer:verification"');
    expectSource(organizerVerificationRoute, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(organizerVerificationRoute, '.from("organizer_verifications")');
    expectSource(organizerVerificationRoute, 'status: "pending"');
    expectSource(organizerVerificationRoute, "approvedStatuses.has(String(existing?.status))");
    expectSource(organizerVerificationPanel, 'fetch("/api/organizer/verification"');
    expectSource(organizerVerificationPanel, 'method: "POST"');
    expectSource(organizerVerificationPanel, "收费活动开放报名前，主办方需要完成认证。");
  });

  it("keeps admin organizer verification review on a platform-admin-only path", () => {
    expectSource(adminOrganizerVerificationRoute, "export async function GET(request: Request)");
    expectSource(adminOrganizerVerificationRoute, "export async function POST(request: Request)");
    expectSource(adminOrganizerVerificationRoute, "requirePlatformAdmin(request)");
    expectSource(adminOrganizerVerificationRoute, "enforceRateLimit(request");
    expectSource(adminOrganizerVerificationRoute, 'keyPrefix: "admin:organizer-verifications"');
    expectSource(adminOrganizerVerificationRoute, "listOrganizerVerifications");
    expectSource(adminOrganizerVerificationRoute, "reviewOrganizerVerification");
    expectSource(adminReviewService, 'from("organizer_verifications")');
    expectSource(adminReviewService, '.from("audit_logs").insert');
    expectSource(adminReviewService, "organizer_verification.");
    expectSource(
      adminPage,
      'import { AdminVerificationReviewPanel } from "@/components/admin-verification-review-panel";'
    );
    expectSource(adminPage, "<AdminVerificationReviewPanel />");
    expectSource(adminVerificationReviewPanel, 'fetch("/api/admin/organizer-verifications"');
    expectSource(adminVerificationReviewPanel, 'method: "POST"');
    expectSource(adminVerificationReviewPanel, "主办认证审核");
  });

  it("keeps admin event review on the platform-admin review gate", () => {
    expectSource(serverAdmin, "export async function requirePlatformAdmin(request: Request)");
    expectSource(serverAdmin, "getAuthenticatedSupabaseClient(request)");
    expectSource(serverAdmin, 'authContext.supabase.rpc("is_platform_admin"');
    expectSource(adminEventReviewRoute, "export async function GET(request: Request)");
    expectSource(adminEventReviewRoute, "export async function POST(request: Request)");
    expectSource(adminEventReviewRoute, "requirePlatformAdmin(request)");
    expectSource(adminEventReviewRoute, "enforceRateLimit(request");
    expectSource(adminEventReviewRoute, 'keyPrefix: "admin:event-reviews"');
    expectSource(adminEventReviewRoute, "listEventReviews");
    expectSource(adminEventReviewRoute, "reviewEventReviewRequest");
    expectSource(adminReviewService, '.from("review_requests")');
    expectSource(adminReviewService, '.eq("target_type", "event")');
    expectSource(adminReviewService, '.from("events")');
    expectSource(adminReviewService, "review_status: nextStatus");
    expectSource(adminReviewService, '.from("audit_logs").insert');
    expectSource(adminReviewService, "event_review.");
    expectSource(adminPage, 'import { AdminEventReviewPanel } from "@/components/admin-event-review-panel";');
    expectSource(adminPage, "<AdminEventReviewPanel />");
    expectSource(adminEventReviewPanel, 'fetch("/api/admin/event-reviews"');
    expectSource(adminEventReviewPanel, 'method: "POST"');
    expectSource(adminEventReviewPanel, "活动审核");
  });

  it("keeps the organizer event workspace on the authenticated Supabase organizer detail adapter", () => {
    expectSource(organizerEventPage, 'import { getOrganizerEventDetail } from "@/lib/organizer-data";');
    expectSource(organizerEventPage, 'import { AuditLogTimeline } from "@/components/audit-log-timeline";');
    expectSource(organizerEventPage, 'import { CheckInPanel } from "@/components/check-in-panel";');
    expectSource(organizerEventPage, 'import { RefundReviewPanel } from "@/components/refund-review-panel";');
    expectSource(organizerEventPage, "await getOrganizerEventDetail(eventId)");
    expectSource(
      organizerEventPage,
      "const { announcements, auditLogs, event, organizers, refundRequests, registrations, setup, waitlistEntries } = eventDetail;"
    );
    expectSource(organizerEventPage, "<AuditLogTimeline logs={auditLogs} />");
    expectSource(organizerEventPage, "<CheckInPanel />");
    expectSource(organizerEventPage, "<RefundReviewPanel eventId={event.id} refundRequests={refundRequests} />");
    expectSource(organizerData, "export async function getOrganizerEventDetail(eventId: string)");
    expectSource(organizerData, "auditLogs: EventAuditLog[];");
    expectSource(organizerData, "refundRequests: EventRefundRequest[];");
    expectSource(organizerData, "await createSupabaseServerClient()");
    expectSource(organizerData, "findUserByAuthUserId(supabase, user.id)");
    expectSource(organizerData, "await canManageEvent(supabase, eventRow.id)");
    expectSource(organizerData, '.from("announcements")');
    expectSource(organizerData, '.from("registrations")');
    expectSource(organizerData, '.from("event_organizers")');
    expectSource(organizerData, "users:users!event_organizers_user_id_fkey");
    expectSource(organizerData, 'reportDataAccessFailure("getOrganizerEventDetail.operations"');
    expectSource(organizerData, '.from("audit_logs")');
    expectSource(organizerData, '.from("refund_requests")');
    expectSource(organizerData, "refundRequestRowToEventRefundRequest");
    expectSource(
      organizerData,
      '.select("id, actor_role, target_type, action, risk_level, reason, before_snapshot, after_snapshot, created_at")'
    );
    expectSource(organizerData, ".limit(12)");
    expectSource(auditLogTimeline, "export function AuditLogTimeline");
    expectSource(auditLogTimeline, "beforeSummary");
    expectSource(auditLogTimeline, "afterSummary");
    expectSource(auditLogTimeline, "riskLevel");

    assert.doesNotMatch(
      organizerEventPage,
      /findEvent|getEventAnnouncements|getEventOrganizers|getEventRegistrations|getEventSetup|@\/lib\/mock-data/
    );
  });

  it("keeps the organizer check-in panel on the authenticated verify API contract", () => {
    expectSource(checkInPanel, '"use client"');
    expectSource(checkInPanel, "getSupabaseBrowserClient().auth.getSession()");
    expectSource(checkInPanel, 'fetch("/api/orders/verify"');
    expectSource(checkInPanel, "Authorization: `Bearer ${accessToken}`");
    expectSource(checkInPanel, "check_in_code: submittedValue");
    expectSource(checkInPanel, "order_number: looksLikeOrderNumber(submittedValue) ? submittedValue : undefined");
    expectSource(checkInPanel, "attendee_count");
    expectSource(checkInPanel, "ALREADY_CHECKED_IN");
    expectSource(checkInPanel, "ORDER_NOT_CONFIRMED");
    expectSource(checkInPanel, "CHECK_IN_CODE_NOT_FOUND");
    expectSource(checkInPanel, ".slice(0, 10)");
  });

  it("keeps the organizer finance workspace on the finance-scoped Supabase adapter", () => {
    expectSource(organizerFinancePage, 'import { getOrganizerFinanceDetail } from "@/lib/organizer-data";');
    expectSource(organizerFinancePage, "await getOrganizerFinanceDetail(eventId)");
    expectSource(organizerFinancePage, "const { event, expenses, registrations, setting, summary } = financeDetail;");
    expectSource(organizerData, "export async function getOrganizerFinanceDetail(eventId: string)");
    expectSource(organizerData, 'supabase.rpc("can_manage_event_finance"');
    expectSource(organizerData, '.from("event_finance_settings")');
    expectSource(organizerData, '.from("event_expenses")');
    expectSource(organizerData, "users!event_expenses_paid_by_fkey(name, public_id)");
    expectSource(organizerData, "buildFinanceSummary(eventRegistrations, expenses)");

    assert.doesNotMatch(
      organizerFinancePage,
      /findEvent|getEventExpenses|getEventFinanceSetting|getEventFinanceSummary|getEventRegistrations|@\/lib\/mock-data/
    );
  });

  it("keeps organizer expense creation on the authenticated finance-scoped API path", () => {
    expectSource(expenseRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(expenseRoute, "enforceRateLimit(request");
    expectSource(expenseRoute, 'keyPrefix: "expenses:create"');
    expectSource(expenseRoute, "createExpenseFromRequestBody");
    expectSource(expenseService, "canManageEventFinance(authContext.supabase, eventId)");
    expectSource(expenseService, '.from("event_expenses")');
    expectSource(expenseService, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(expenseService, '餐饮茶歇: "food"');
    expectSource(expenseService, '交通快递: "transport"');

    expectSource(organizerFinancePage, "<ExpenseLedger eventId={event.id} expenses={expenses} />");
    expectSource(expenseLedger, 'fetch("/api/expenses"');
    expectSource(expenseLedger, "getSupabaseBrowserClient()");
    assert.doesNotMatch(expenseLedger, /接入数据库后会长期保存/);
  });

  it("keeps organizer expense proofs bound to the private Storage path and finance API", () => {
    expectSource(expenseProofRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(expenseProofRoute, "enforceRateLimit(request");
    expectSource(expenseProofRoute, 'keyPrefix: "expenses:proof"');
    expectSource(expenseProofRoute, "uploadExpenseProofFromRequestBody");
    expectSource(expenseProofRoute, "voidExpenseProofFromRequestBody");
    expectSource(expenseService, "getSupabaseServiceClient()");
    expectSource(expenseService, 'replace(/^expense-proofs\\//, "")');
    expectSource(expenseService, "canManageEventFinance(authContext.supabase, eventId)");
    expectSource(expenseService, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(expenseService, '.eq("bucket_id", "expense-proofs")');
    expectSource(expenseService, '.from("event_expenses")');
    expectSource(expenseService, "proof_url: storagePath");
    expectSource(expenseService, "writeExpenseProofAudit");
    expectSource(expenseService, 'action: "expense_proof.uploaded"');
    expectSource(expenseProofRoute, "export async function DELETE(request: Request)");
    expectSource(expenseService, "只有活动主办或财务协作者可以作废支出凭证。");
    expectSource(expenseService, "proof_url: null");
    expectSource(expenseService, '.eq("proof_url", expense.proof_url)');
    expectSource(expenseService, 'action: "expense_proof.voided"');
    expectSource(expenseService, '.from("audit_logs").insert');

    expectSource(organizerFinancePage, "<ExpenseProofList eventId={event.id} expenses={expenses} />");
    expectSource(expenseProofList, '.from("expense-proofs")');
    expectSource(expenseProofList, 'fetch("/api/expenses/proof"');
    expectSource(expenseProofList, 'method: "DELETE"');
    expectSource(expenseProofList, "作废凭证");
    expectSource(expenseProofList, "`${eventId}/${expense.id}/${Date.now()}-${safeFileName(file.name)}`");
  });

  it("keeps seat locking and confirmation on authenticated Supabase RPC paths", () => {
    expectSource(seatLockRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(seatLockRoute, "enforceRateLimit(request");
    expectSource(seatLockRoute, 'keyPrefix: "seats:lock"');
    expectSource(seatLockRoute, "lockSeatFromRequestBody");
    expectSource(orderService, 'authContext.supabase.rpc("create_seat_lock_atomic"');
    expectSource(orderService, "p_registration_id: registrationId");
    expectSource(orderService, "p_seat_id: seatId");

    expectSource(seatConfirmRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(seatConfirmRoute, "enforceRateLimit(request");
    expectSource(seatConfirmRoute, 'keyPrefix: "seats:confirm"');
    expectSource(seatConfirmRoute, "confirmSeatFromRequestBody");
    expectSource(orderService, 'authContext.supabase.rpc("confirm_seat_assignment_atomic"');
    expectSource(orderService, "p_seat_lock_id: seatLockId");
    expectSource(orderService, "p_attendee_id: attendeeId");

    assert.doesNotMatch(seatLockRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(seatConfirmRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(seatLockRoute, /\.from\("seat_locks"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(seatConfirmRoute, /\.from\("seat_assignments"\)\s*\n\s*\.insert/);
  });

  it("keeps real seat selection wired through the order detail panel", () => {
    expectSource(orderPage, "OrderSeatSelectionPanel");
    expectSource(orderPage, "orderDetail.seatSelection");
    expectSource(orderSeatSelectionPanel, 'fetch("/api/seats/lock"');
    expectSource(orderSeatSelectionPanel, 'fetch("/api/seats/confirm"');
    expectSource(orderSeatSelectionPanel, "Authorization: `Bearer ${accessToken}`");
    expectSource(orderSeatSelectionPanel, "registration_id: registrationId");
    expectSource(orderSeatSelectionPanel, "seat_id: selectedSeatId");
    expectSource(orderSeatSelectionPanel, "seat_lock_id: lockResult.seat_lock_id");
    expectSource(orderSeatSelectionPanel, "attendee_id: selectedAttendeeId");
    expectSource(orderSeatSelectionPanel, "setLocalAttendees");
    expectSource(orderSeatSelectionPanel, "setLocalSeats");
    expectSource(orderSeatSelectionPanel, 'status: "assigned"');
  });

  it("keeps waitlist actions on authenticated Supabase RPC paths", () => {
    expectSource(waitlistRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(waitlistRoute, "enforceRateLimit(request");
    expectSource(waitlistRoute, 'keyPrefix: "waitlist:join"');
    expectSource(waitlistRoute, 'authContext.supabase.rpc("join_waitlist_atomic"');
    expectSource(waitlistRoute, "p_event_id: eventId");
    expectSource(waitlistRoute, "p_desired_quantity:");
    expectSource(waitlistRoute, "CAPACITY_AVAILABLE");

    expectSource(waitlistInviteRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(waitlistInviteRoute, "enforceRateLimit(request");
    expectSource(waitlistInviteRoute, 'keyPrefix: "waitlist:invite"');
    expectSource(waitlistInviteRoute, "inviteWaitlistFromRequestBody");
    expectSource(waitlistService, 'authContext.supabase.rpc("invite_waitlist_entry_atomic"');
    expectSource(waitlistService, "p_waitlist_entry_id: waitlistEntryId");
    expectSource(waitlistService, "INVALID_WAITLIST_STATUS");
    expectSource(waitlistConvertRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(waitlistConvertRoute, "enforceRateLimit(request");
    expectSource(waitlistConvertRoute, 'keyPrefix: "waitlist:convert"');
    expectSource(waitlistConvertRoute, "convertWaitlistFromRequestBody");
    expectSource(waitlistService, 'authContext.supabase.rpc("convert_waitlist_entry_atomic"');
    expectSource(waitlistService, "p_waitlist_entry_id: waitlistEntryId");
    expectSource(waitlistService, "WAITLIST_INVITATION_EXPIRED");
    expectSource(registrationFlow, 'fetch("/api/waitlist"');
    expectSource(registrationFlow, "capacityFull");
    expectSource(registrationFlow, "event.acceptWaitlist !== false");
    expectSource(registrationFlow, "加入候补");
    expectSource(waitlistPanel, 'fetch("/api/waitlist/invite"');
    expectSource(waitlistPanel, "waitlist_entry_id: entry.id");
    expectSource(waitlistInvitationActions, 'fetch("/api/waitlist/convert"');
    expectSource(waitlistInvitationActions, "waitlist_entry_id: waitlistEntryId");
    expectSource(myOrdersPage, "waitlistInvitations");
    expectSource(myOrdersPage, "<WaitlistInvitationActions");
    expectSource(ordersData, '.from("waitlist_entries")');
    expectSource(ordersData, '.in("status", ["waiting", "invited"])');
    expectSource(organizerEventPage, 'import { WaitlistPanel } from "@/components/waitlist-panel";');
    expectSource(organizerEventPage, "waitlistEntries");
    expectSource(organizerEventPage, "<WaitlistPanel entries={waitlistEntries} />");
    expectSource(organizerData, "waitlistEntries: EventWaitlistEntry[];");
    expectSource(organizerData, '.from("waitlist_entries")');
    expectSource(organizerData, "waitlistEntryRowToEventWaitlistEntry");
    expectSource(eventsData, "getActiveRegistrationCounts");
    expectSource(ordersData, "getActiveRegistrationCounts");
    expectSource(eventRegistrationCounts, 'supabase.rpc("get_public_event_registration_counts"');
    assert.doesNotMatch(eventsData, /\.select\([^)]*registered_count/);
    assert.doesNotMatch(ordersData, /\.select\([^)]*registered_count/);
    assert.doesNotMatch(organizerData, /\.select\([^)]*registered_count/);

    assert.doesNotMatch(waitlistRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(waitlistInviteRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(waitlistRoute, /\.from\("waitlist_entries"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(waitlistInviteRoute, /\.from\("waitlist_entries"\)\s*\n\s*\.update/);
    assert.doesNotMatch(waitlistConvertRoute, /\.from\("registrations"\)\s*\n\s*\.insert/);
    assert.doesNotMatch(waitlistConvertRoute, /\.from\("waitlist_entries"\)\s*\n\s*\.update/);
  });

  it("keeps organizer announcements published through an authenticated API route", () => {
    expectSource(announcementPublishRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(announcementPublishRoute, "enforceRateLimit(request");
    expectSource(announcementPublishRoute, 'keyPrefix: "announcements:create"');
    expectSource(announcementPublishRoute, '.from("announcements")');
    expectSource(announcementPublishRoute, ".insert({");
    expectSource(announcementPublishRoute, 'published_at: status === "published" ? new Date().toISOString() : null');
    expectSource(announcementCenter, 'fetch("/api/announcements"');
    expectSource(announcementCenter, "Authorization: `Bearer ${accessToken}`");
    expectSource(announcementCenter, "通知已发布并写入数据库");
    expectSource(announcementCenter, "真实发布需要先使用 Supabase 账号登录");
  });

  it("keeps in-app notifications on authenticated RLS reads and read-state RPC updates", () => {
    expectSource(notificationRoute, "getAuthenticatedSupabaseClient(request)");
    expectSource(notificationRoute, "enforceRateLimit(request");
    expectSource(notificationRoute, 'keyPrefix: "notifications:read"');
    expectSource(notificationRoute, "listNotifications(request, authContext)");
    expectSource(notificationRoute, "markNotificationsRead(body, authContext)");
    expectSource(notificationService, "findUserByAuthUserId(authContext.supabase, authContext.user.id)");
    expectSource(notificationService, '.from("notification_deliveries")');
    expectSource(notificationService, '.eq("recipient_id", appUser.id)');
    expectSource(notificationService, '.eq("channel", "in_app")');
    expectSource(notificationService, '.is("read_at", null)');
    expectSource(notificationService, 'authContext.supabase.rpc("mark_notification_deliveries_read"');
    expectSource(notificationService, "p_mark_all: markAll");

    assert.doesNotMatch(notificationRoute, /getSupabaseServiceClient/);
    assert.doesNotMatch(notificationRoute, /\.from\("notification_deliveries"\)\s*\n\s*\.update/);
  });

  it("keeps the notification bell wired through the shared app shell", () => {
    expectSource(appShell, "NotificationBell");
    expectSource(appShell, 'enabled={session.sessionType === "supabase"}');
    expectSource(notificationBell, 'fetch("/api/notifications?limit=10"');
    expectSource(notificationBell, 'fetch("/api/notifications"');
    expectSource(notificationBell, "Authorization: `Bearer ${accessToken}`");
    expectSource(notificationBell, "setUnreadCount(result.unread_count ?? 0)");
    expectSource(notificationBell, "setNotifications(result.notifications ?? [])");
    expectSource(notificationBell, "JSON.stringify({ all: true })");

    assert.doesNotMatch(notificationBell, /\.from\("notification_deliveries"\)/);
  });
});
