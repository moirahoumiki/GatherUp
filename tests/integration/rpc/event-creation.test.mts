import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  cleanupRpcIntegrationData,
  createAuthAndAppUser,
  makeAdminClient,
  makeAnonClient,
  makeSignedInClient,
  requiredEnvConfigured,
  shouldRunRpcIntegration,
  type TestAuthUser
} from "./_helpers.mts";

const shouldRun = shouldRunRpcIntegration && requiredEnvConfigured;

function eventPayload(publicCode: string) {
  const startsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const registrationDeadline = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  return {
    p_public_code: publicCode,
    p_name: "Atomic Event Integration",
    p_category: "community",
    p_template: "payment_registration",
    p_custom_type_label: "Integration",
    p_city: "Tokyo",
    p_venue_name: "Atomic Test Venue",
    p_address: "Integration address",
    p_starts_at: startsAt,
    p_registration_deadline: registrationDeadline,
    p_capacity: 30,
    p_price_cents: 1200,
    p_description: "Created by the atomic event integration test.",
    p_payment_instructions: "Upload a payment proof.",
    p_custom_form_config: { fields: [{ key: "nickname", required: true }] },
    p_payment_code_img: "event-assets/atomic-payment-code.png",
    p_wechat_group_img: null,
    p_allow_multi_person_registration: true,
    p_max_people_per_registration: 4,
    p_order_number_prefix: "ATOMIC",
    p_fee_mode: "paid",
    p_settlement_rule: "Offline organizer settlement",
    p_payment_method: "wechat"
  };
}

describe("GatherUp atomic event creation", { skip: !shouldRun }, () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let owner: TestAuthUser;
  let ownerClient: SupabaseClient;
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const createdAuthUserIds: string[] = [];
  const createdAppUserIds: string[] = [];
  const createdEventIds: string[] = [];

  before(async () => {
    admin = makeAdminClient();
    anon = makeAnonClient();
    owner = await createAuthAndAppUser(admin, suffix.toLowerCase(), "eventowner");
    ownerClient = await makeSignedInClient(owner.email, owner.password);
    createdAuthUserIds.push(owner.authUserId);
    createdAppUserIds.push(owner.appUserId);
  });

  after(async () => {
    await cleanupRpcIntegrationData(admin, {
      eventIds: createdEventIds,
      appUserIds: createdAppUserIds,
      authUserIds: createdAuthUserIds
    });
  });

  it("does not expose event creation to anonymous callers", async () => {
    const { data, error } = await anon.rpc("create_event_atomic", eventPayload(`GU-ATOMIC-ANON-${suffix}`));

    assert.ok(error || data?.success === false);
  });

  it("creates the event and every required operational record in one RPC", async () => {
    const publicCode = `GU-ATOMIC-${suffix}`;
    const { data, error } = await ownerClient.rpc("create_event_atomic", eventPayload(publicCode));

    assert.ifError(error);
    assert.equal(data?.success, true);
    assert.equal(data?.public_code, publicCode);
    assert.ok(data?.event_id);
    createdEventIds.push(data.event_id as string);

    const [eventResult, organizerResult, financeResult, collectionCodeResult, auditResult] = await Promise.all([
      admin.from("events").select("id, organizer_id, status").eq("id", data.event_id).single(),
      admin.from("event_organizers").select("user_id, role, status").eq("event_id", data.event_id).single(),
      admin.from("event_finance_settings").select("fee_mode, revenue_source").eq("event_id", data.event_id).single(),
      admin
        .from("collection_code_versions")
        .select("version_number, status, uploaded_by")
        .eq("event_id", data.event_id)
        .single(),
      admin
        .from("audit_logs")
        .select("actor_id, action, target_id")
        .eq("event_id", data.event_id)
        .eq("action", "event.created")
        .single()
    ]);

    assert.ifError(eventResult.error);
    assert.equal(eventResult.data.organizer_id, owner.appUserId);
    assert.equal(eventResult.data.status, "draft");
    assert.ifError(organizerResult.error);
    assert.deepEqual(organizerResult.data, { user_id: owner.appUserId, role: "owner", status: "active" });
    assert.ifError(financeResult.error);
    assert.deepEqual(financeResult.data, { fee_mode: "paid", revenue_source: "registration_orders" });
    assert.ifError(collectionCodeResult.error);
    assert.deepEqual(collectionCodeResult.data, { version_number: 1, status: "active", uploaded_by: owner.appUserId });
    assert.ifError(auditResult.error);
    assert.deepEqual(auditResult.data, {
      actor_id: owner.appUserId,
      action: "event.created",
      target_id: data.event_id
    });

    const { data: countData, error: countError } = await anon.rpc("get_public_event_registration_counts", {
      p_event_ids: [data.event_id]
    });

    assert.ifError(countError);
    assert.deepEqual(countData, [{ event_id: data.event_id, registered_count: 0 }]);
  });

  it("rejects a duplicate public code without creating another event", async () => {
    const publicCode = `GU-ATOMIC-${suffix}`;
    const { data, error } = await ownerClient.rpc("create_event_atomic", eventPayload(publicCode));

    assert.ifError(error);
    assert.equal(data?.success, false);
    assert.equal(data?.error_code, "PUBLIC_CODE_CONFLICT");

    const { count, error: countError } = await admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("public_code", publicCode);

    assert.ifError(countError);
    assert.equal(count, 1);
  });

  it("rejects invalid limits before any event row is written", async () => {
    const publicCode = `GU-ATOMIC-BAD-${suffix}`;
    const { data, error } = await ownerClient.rpc("create_event_atomic", {
      ...eventPayload(publicCode),
      p_capacity: 0
    });

    assert.ifError(error);
    assert.equal(data?.success, false);
    assert.equal(data?.error_code, "INVALID_EVENT_LIMITS");

    const { count, error: countError } = await admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("public_code", publicCode);

    assert.ifError(countError);
    assert.equal(count, 0);
  });
});
