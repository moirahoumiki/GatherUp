# GatherUp commercial v0.1 Supabase live validation log

Last updated: 2026-07-19

This log records real Supabase validation attempts and findings. It is not a replacement for the SQL execution runbook; it captures what actually happened against a live project.

## 2026-06-05 Live Project Preflight

Project:

- Supabase project name: `gatherup`
- Supabase project ref: `mmqsirjrugprldjnvdtj`
- Dashboard branch label: `main`
- Dashboard environment label: `PRODUCTION`
- Region: Northeast Asia (Tokyo), `ap-northeast-1`
- Compute: Nano

Actions completed:

1. Restored the paused Supabase project from the Dashboard.
2. Confirmed the SQL Editor is available after restoration.
3. Ran a read-only preflight query against the primary database.

Preflight result:

- Existing target public tables: `8`
- Existing target custom types: `8`

Existing target public tables:

- `event_organizers`
- `events`
- `payments`
- `registrations`
- `seat_assignments`
- `seats`
- `user_auth_identities`
- `users`

Existing target custom types:

- `auth_identity_provider`
- `event_category`
- `event_status`
- `event_template`
- `event_visibility`
- `payment_status`
- `registration_status`
- `seat_status`

Conclusion:

- This project is not an empty validation database.
- Do not run the full `supabase/schema.sql` directly against this project.
- Running the full schema as-is would conflict with existing `create type` and `create table` statements.

Required next step:

1. Run the read-only coverage audit query from the runbook to compare the live database against the current schema draft.
2. Choose one of these paths before any write SQL:
   - Create a fresh dev/staging Supabase project and run the full schema there.
   - Reset/rebuild this project only if its current data can be discarded.
   - Write an incremental migration from the current live schema to the commercial v0.1 schema.

Current recommendation:

- Use a fresh dev/staging Supabase project for first full execution of `schema.sql`, `seed.sql`, and `storage.sql`.
- Treat the current `gatherup` project as a partially initialized environment until coverage audit proves otherwise.

## 2026-06-06 Live Project Coverage Audit

Actions completed:

1. Opened a new Supabase SQL Editor query in the live `gatherup` project.
2. Ran the read-only schema presence and RLS coverage audit from the runbook.
3. Exported the SQL result as JSON for local summarization.

Audit result:

- Total rows returned: `89`
- Expected public tables: `30`
- Existing public tables: `15`
- Missing public tables: `15`
- Existing tables with RLS enabled: `15`
- Existing tables with RLS disabled: `0`
- Expected custom types: `39`
- Existing custom types: `15`
- Missing custom types: `24`
- Expected functions: `12`
- Existing functions: `9`
- Missing functions: `3`
- Expected storage buckets: `8`
- Existing storage buckets: `0`
- Missing storage buckets: `8`

Existing public tables:

- `announcements`
- `audit_logs`
- `event_expenses`
- `event_finance_settings`
- `event_order_counters`
- `event_organizers`
- `events`
- `payment_proofs`
- `payments`
- `registration_attendees`
- `registrations`
- `seat_assignments`
- `seats`
- `user_auth_identities`
- `users`

Missing public tables:

- `activity_materials`
- `admin_users`
- `check_ins`
- `collection_code_versions`
- `complaints`
- `export_jobs`
- `notification_deliveries`
- `organizer_verifications`
- `platform_settings`
- `refund_proofs`
- `refund_requests`
- `review_requests`
- `seat_locks`
- `user_public_id_history`
- `waitlist_entries`

Existing custom types:

- `announcement_status`
- `auth_identity_provider`
- `contact_type`
- `event_category`
- `event_expense_category`
- `event_expense_status`
- `event_fee_mode`
- `event_organizer_role`
- `event_status`
- `event_template`
- `event_visibility`
- `order_number_format`
- `payment_status`
- `registration_status`
- `seat_status`

Missing custom types:

- `activity_material_type`
- `activity_material_visibility`
- `admin_role`
- `admin_status`
- `audit_risk_level`
- `check_in_status`
- `collection_code_status`
- `complaint_status`
- `complaint_target_type`
- `export_status`
- `location_visibility`
- `notification_channel`
- `notification_delivery_status`
- `organizer_verification_status`
- `payment_proof_status`
- `payment_proof_type`
- `platform_setting_value_type`
- `price_visibility`
- `refund_status`
- `review_status`
- `review_target_type`
- `seat_lock_status`
- `seat_selection_mode`
- `waitlist_status`

Existing functions:

- `can_edit_event`
- `can_manage_event`
- `can_manage_event_finance`
- `create_payment_for_registration`
- `current_app_user_id`
- `mark_payment_submitted_from_proof`
- `prevent_public_id_over_limit`
- `set_updated_at`
- `sync_seat_status_on_assignment`

Missing functions:

- `can_handle_event_refunds`
- `can_manage_event_payments`
- `is_platform_admin`

Missing storage buckets:

- `activity-covers`
- `activity-materials`
- `collection-codes`
- `complaint-evidence`
- `expense-proofs`
- `exports`
- `payment-proofs`
- `refund-proofs`

Conclusion:

- The live `gatherup` project is a partially initialized GatherUp database.
- It should not receive the full `supabase/schema.sql` as-is.
- Because all existing expected tables have RLS enabled, the partial database is not obviously unsafe at the table-RLS layer, but it is incomplete for commercial v0.1.

Recommended next step:

1. Create and validate against a fresh dev/staging Supabase project first.
2. After the clean dev/staging execution passes, decide whether to rebuild the live project or write an incremental migration for the missing objects above.

## 2026-06-07 Clean Dev/Staging Execution

Actions completed:

1. Created a new Supabase organization for isolated validation:
   - Organization name: `GatherUp Dev`
   - Plan shown in Dashboard: `Free`
   - Organization ref shown in project creation URL: `juvctqcorlckelbvhefc`
2. Created the clean validation project:
   - Supabase project name: `gatherup-commercial-v01-validation`
   - Supabase project ref: `oxbrxkllftyevlzmiydt`
   - Dashboard URL: `https://supabase.com/dashboard/project/oxbrxkllftyevlzmiydt`
   - API URL: `https://oxbrxkllftyevlzmiydt.supabase.co`
   - Dashboard branch label: `main`
   - Dashboard environment label: `PRODUCTION`
   - Region: Tokyo, `ap-northeast-1`
   - Compute: Nano, `t4g.nano`
3. Confirmed project creation posture:
   - `Enable Data API`: enabled.
   - `Automatically expose new tables`: disabled before creation.
   - `Enable automatic RLS`: left disabled because `supabase/schema.sql` explicitly enables RLS on all public tables.
4. Ran `supabase/validation/00-clean-project-preflight.sql`.
5. Ran `supabase/schema.sql`.
6. Ran `supabase/seed.sql`.
7. Ran `supabase/storage.sql`.

Preflight result:

- Existing target public tables: `0`
- Existing target custom types: `0`
- Conclusion: safe clean first-run validation target.

Execution result:

- `supabase/schema.sql`: succeeded with `Success. No rows returned`.
- `supabase/seed.sql`: succeeded with `Success. No rows returned`.
- `supabase/storage.sql`: first attempt failed, then succeeded after local fix.

Storage failure:

```text
ERROR: 22P02: invalid input value for enum activity_material_visibility: "public"
```

Root cause:

- `supabase/schema.sql` defines `activity_material_visibility` as:
  - `participant`
  - `organizer_internal`
- `supabase/storage.sql` still referenced older draft values:
  - `public`
  - `participants_only`

Fix applied:

- Updated the activity material Storage read policy to use `m.visibility = 'participant'`.
- Removed the stale `participants_only` participant-registration branch from the Storage policy.
- This aligns Storage access with the table-level `activity_materials` read policy, where participant-visible materials are represented by `participant`.

Current state:

- Clean dev/staging schema execution is validated through `schema.sql`, `seed.sql`, and corrected `storage.sql`.
- The corrected `storage.sql` has been rerun successfully in the Supabase SQL Editor.
- The SQL Editor became unstable while attempting follow-up validation queries, so the post-execution validation queries below still need to be run and recorded.

Remaining validation queries:

1. `supabase/validation/02-post-seed-counts.sql`
2. `supabase/validation/03-identity-integrity.sql`
3. `supabase/validation/04-payment-setup.sql`
4. `supabase/validation/05-storage-buckets.sql`
5. `supabase/validation/01-coverage-audit.sql`

Local verification after the Storage fix:

- `npm run verify`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

Important:

- Do not record database passwords in repository files.
- Do not run SQL against the live `gatherup` project.

## 2026-06-12 Public Read Grant Follow-Up

Reason:

- The public event detail page is intentionally visible before login for public and link-only events.
- The existing RLS policies allowed the public surfaces, but the schema grant section did not yet grant anonymous `select` on those public-facing tables.
- Without the grants, the first Supabase-backed public read path could fail even when RLS policy logic is correct.

Local changes completed:

1. Added anonymous read grants in `supabase/schema.sql` for only the public event detail surfaces:
   - `public.events`
   - `public.announcements`
   - `public.activity_materials`
2. Added anonymous execute grants for helper functions referenced by public read RLS policies:
   - `public.current_app_user_id()`
   - `public.can_manage_event(uuid)`
   - `public.is_platform_admin()`
3. Kept sensitive workflow tables private to authenticated/service flows:
   - `registrations`
   - `payments`
   - `payment_proofs`
   - `refund_requests`
   - `refund_proofs`
4. Added a schema contract test to prevent accidental anonymous grants on sensitive workflow tables.
5. Added `supabase/validation/06-public-read-grants.sql` as a patch for clean dev/staging databases that were created before the grant update.
6. Added `supabase/validation/07-clean-dev-post-execution-summary.sql` to consolidate post-execution validation into one result table.

Real SQL execution status:

- `06-public-read-grants.sql`: pending in Supabase SQL Editor.
- `09-service-role-grants.sql`: pending in Supabase SQL Editor.
- `07-clean-dev-post-execution-summary.sql`: pending in Supabase SQL Editor.

Blocker:

- The local environment rejected the required system-clipboard authorization used to paste SQL into the already-authenticated Supabase SQL Editor.
- Because the approval denial explicitly prohibited indirect workarounds, the SQL Editor execution step was not forced through another path.

Next required action:

1. Run `supabase/validation/06-public-read-grants.sql` in the clean dev/staging project `oxbrxkllftyevlzmiydt`.
2. Run `supabase/validation/09-service-role-grants.sql` in the same project.
3. Run `supabase/validation/07-clean-dev-post-execution-summary.sql` in the same project.
4. Record the resulting rows here. The expected state is that every returned row has `ok = true`.

## 2026-06-22 RPC Integration Permission Preflight

Target project:

- `gatherup-commercial-v01-validation`
- Project ref: `oxbrxkllftyevlzmiydt`
- Region: Tokyo / `ap-northeast-1`
- Dashboard status observed as healthy.

Command attempted:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=oxbrxkllftyevlzmiydt npm run test:integration:rpc
```

Observed result:

- The test runner reached the real Supabase project.
- All suites stopped during fixture setup because the service-role test client could create Supabase Auth users, but could not insert matching rows into `public.users`.
- Exact database error class: `42501`.
- Exact behavior: `permission denied for table users`.
- Supabase hint: grant `INSERT` on `public.users` to `service_role`.

Fix prepared:

1. `supabase/schema.sql` now grants public schema/table/sequence/function privileges to `service_role` for future clean projects.
2. `supabase/validation/09-service-role-grants.sql` can patch the current clean dev/staging project.
3. `tests/schema-contract.test.mts` now prevents accidental removal of these grants.

Next required action:

1. Run `supabase/validation/09-service-role-grants.sql` in the Supabase SQL Editor for `oxbrxkllftyevlzmiydt`.
2. Re-run the RPC integration command above.
3. If tests fail later in the workflow, record the next concrete failure here.

## 2026-06-22 Service-Role Grant Patch Result

Target project:

- `gatherup-commercial-v01-validation`
- Project ref: `oxbrxkllftyevlzmiydt`

Script executed:

- `supabase/validation/09-service-role-grants.sql`

Observed result:

| check_name | ok |
| --- | --- |
| `service_role_can_use_public_schema` | true |
| `service_role_can_insert_users` | true |
| `service_role_can_manage_events` | true |
| `registration_rpc_exists` | false |
| `service_role_can_execute_registration_rpc` | false |

Interpretation:

- The service-role grant blocker is fixed.
- The clean validation project does not currently contain the latest `public.create_registration_atomic` RPC.
- The database is therefore not on the latest `supabase/schema.sql` contract yet.

Follow-up:

1. Updated `supabase/validation/08-create-registration-rpc-contract.sql` so missing RPCs report `ok = false` instead of causing SQL execution to fail.
2. Added `supabase/validation/00-reset-clean-validation-project.sql` for the chosen reset-and-rebuild path.
3. Next required database step is to reset the clean validation project and reapply the current schema/RPC definitions before running `npm run test:integration:rpc` again.

Chosen recovery path:

1. Run `supabase/validation/00-reset-clean-validation-project.sql`.
2. Run `supabase/schema.sql`.
3. Run `supabase/seed.sql`.
4. Run `supabase/storage.sql`.
5. Run `supabase/validation/06-public-read-grants.sql`.
6. Run `supabase/validation/09-service-role-grants.sql`.
7. Run `supabase/validation/08-create-registration-rpc-contract.sql`.
8. Run `supabase/validation/07-clean-dev-post-execution-summary.sql`.
9. Re-run the opt-in RPC integration suite from local Codex.

## 2026-06-22 First Real RPC Integration Run After Clean Rebuild

Target project:

- `gatherup-commercial-v01-validation`
- Project ref: `oxbrxkllftyevlzmiydt`

Preconditions completed:

- `00-reset-clean-validation-project.sql`: success.
- `schema.sql`: success.
- `seed.sql`: success.
- `storage.sql`: success.
- `06-public-read-grants.sql`: success.
- `09-service-role-grants.sql`: all checks true.
- `08-create-registration-rpc-contract.sql`: all checks true.
- `07-clean-dev-post-execution-summary.sql`: all checks true.

Command:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=oxbrxkllftyevlzmiydt npm run test:integration:rpc
```

Observed result:

- 19 integration tests ran.
- 7 passed.
- 12 failed.

Confirmed working:

- Anonymous registration RPC calls are rejected.
- Authenticated registration creation works.
- Duplicate active registration rejection works.
- Capacity contention protection works.
- Basic payment-proof Storage upload owner boundary works.
- Same-event participant path isolation works.
- Malformed Storage proof paths are rejected.

Primary failure cluster:

- Inserting `payment_proofs` did not move the related registration from `awaiting_payment` to `payment_submitted`.
- This caused payment review, check-in, refund, concurrency, and several Storage read/refund tests to fail downstream.

Secondary Storage failure:

- A participant-uploaded payment proof object could be deleted by the authenticated participant client.
- Sensitive payment/refund proof objects need explicit restrictive update/delete policies in Storage, not only the absence of local delete policies.

Fix prepared:

1. `supabase/schema.sql` now updates `registrations.status` to `payment_submitted` inside `mark_payment_submitted_from_proof()`.
2. `supabase/storage.sql` now adds restrictive update/delete policies for `payment-proofs` and `refund-proofs`.
3. `supabase/validation/10-payment-proof-submission-and-storage-immutability.sql` patches the current clean validation project without another reset.
4. `tests/schema-contract.test.mts` now guards both the registration status update and proof immutability policy names.

Next required action:

1. Run `supabase/validation/10-payment-proof-submission-and-storage-immutability.sql` in the Supabase SQL Editor.
2. Confirm the final result rows are all `ok = true`.
3. Re-run the opt-in RPC integration suite.

## 2026-06-22 Second Real RPC Integration Run

Target project:

- `gatherup-commercial-v01-validation`
- Project ref: `oxbrxkllftyevlzmiydt`

Preconditions completed:

- `10-payment-proof-submission-and-storage-immutability.sql`: all checks true.

Command:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=oxbrxkllftyevlzmiydt npm run test:integration:rpc
```

Observed result:

- 19 integration tests ran.
- 16 passed.
- 3 failed.

Confirmed newly working:

- Concurrent payment review race.
- Concurrent check-in race.
- Concurrent seat lock race.
- Payment review RPC happy path.
- Check-in RPC happy path.
- Payment/refund proof read boundaries.
- Confirmed orders reject replacement payment-proof uploads.

Remaining failures:

1. `record_refund_proof_atomic` returned `success = false` after refund approval.
   - Root cause: the function writes a notification to `v_refund.requested_by` but did not select `rr.requested_by` into the record.
2. Storage delete calls can return success-like responses even when the product guarantee should be object persistence.
   - Test assertion updated to verify the object remains readable after an authenticated delete attempt, rather than requiring the SDK call to expose an error.

Fix prepared:

1. `supabase/schema.sql` now selects `rr.requested_by` inside `record_refund_proof_atomic`.
2. `supabase/validation/11-record-refund-proof-requested-by.sql` patches the current clean validation project.
3. `tests/schema-contract.test.mts` now guards the `rr.requested_by` selection.
4. `tests/integration/rpc/storage-proof-access.test.mts` now verifies persistence after delete attempts.

Next required action:

1. Run `supabase/validation/11-record-refund-proof-requested-by.sql` in the Supabase SQL Editor.
2. Confirm the final result row is `ok = true`.
3. Re-run the opt-in RPC integration suite.

## 2026-06-28 Real RPC Integration Suite Passed

Target project:

- `gatherup-commercial-v01-validation`
- Project ref: `oxbrxkllftyevlzmiydt`

Command:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=oxbrxkllftyevlzmiydt npm run test:integration:rpc
```

Observed result:

- 19 integration tests ran.
- 19 passed.
- 0 failed.

Validated real Supabase behaviors:

- Anonymous registration RPC calls are rejected.
- Authenticated registration creation succeeds.
- Duplicate active registrations are rejected.
- Capacity contention prevents oversell.
- Payment proof submission moves orders into review.
- Payment review RPC confirms submitted payments.
- Check-in RPC records arrivals and rejects duplicate scans.
- Refund request, review, and proof upload RPC chain completes.
- Concurrent payment review allows exactly one reviewer to win.
- Concurrent check-in allows exactly one staff member to win.
- Concurrent seat lock allows exactly one participant to hold a seat.
- Payment proof Storage upload is limited to the registration owner.
- Payment proof reads are limited to the order owner and payment managers.
- Refund proof upload is limited to refund managers.
- Refund proof reads are limited to the order owner and refund managers.
- Same-event participants cannot upload into another participant's proof path.
- Confirmed orders reject replacement participant payment-proof uploads.
- Malformed proof paths are rejected by Storage RLS.
- Payment/refund proof objects remain readable after authenticated delete attempts.

Conclusion:

- The clean Supabase validation project has passed the commercial v0.1 RPC and private Storage RLS integration baseline.
- The next engineering step can move from database/RPC validation into service/UI integration and remaining product workflows.

## 2026-06-12 First Supabase-Backed Public Reads

Local application changes completed:

1. Added a server-side Supabase client in `src/lib/supabase/server.ts`.
2. Added `src/lib/events-data.ts` as the first real-data adapter for public event reads.
3. Updated `/` to load activity square data through `getPublicEvents()`.
4. Updated `/events/[eventId]` to load event detail data through `getPublicEventDetail()`.
5. Preserved mock fallback behavior for local development and unavailable Supabase environments.

Current read behavior:

- Activity square lists only `visibility = 'public'` events.
- Event detail can be loaded by UUID or `public_code`.
- Public and link-only detail access remains governed by database RLS.
- Published announcements are read from Supabase when available.
- Registration counts, payment counts, seat counts, organizer public profile data, and write workflows remain mock/future-service-layer work.

Local verification:

- `npm run verify`: passed before this documentation update.
- `npm run build`: passed before this documentation update.
- `git diff --check`: passed before this documentation update.

## 2026-06-14 Atomic Registration RPC Draft

Reason:

- The early `/api/orders` implementation generated order numbers in application code by counting registrations.
- That approach is not safe under concurrent registration bursts because two users can observe the same count and attempt the same order number.
- Capacity checks also need to happen inside the same database transaction path as registration creation.

Local changes completed:

1. Added `public.create_registration_atomic(...)` to `supabase/schema.sql`.
2. The RPC uses the current GatherUp schema instead of external draft field names:
   - `events.price_cents`
   - `event_order_counters.current_number`
   - `registrations.order_number`
   - `registration_answers` and `form_answers`
   - `registration_attendees.public_id` / `display_name`
3. The RPC intentionally does not handle seat selection yet. Seat locking remains a separate future RPC because the confirmed product flow is payment confirmation before seat selection.
4. Updated `/api/orders` to call the RPC with a user JWT client when Supabase Auth is available.
5. Added `supabase/validation/08-create-registration-rpc-contract.sql` for live database contract verification.
6. Updated coverage validation expected function lists to include `create_registration_atomic`.
7. Added local schema contract coverage for the RPC.

Local verification:

- `npm run verify`: passed with `29` tests.
- `npm run build`: passed after clearing stale `.next` build cache.
- `git diff --check`: pending final pre-commit run.

Real SQL execution status:

- `create_registration_atomic` has not yet been applied to the clean Supabase project.
- Required next SQL sequence on clean dev/staging:
  1. Apply the updated `supabase/schema.sql` or an equivalent migration containing `create_registration_atomic`.
  2. Run `supabase/validation/08-create-registration-rpc-contract.sql`.
  3. Re-run `supabase/validation/07-clean-dev-post-execution-summary.sql`.

## 2026-06-14 Organizer API JWT Gate

Reason:

- A code review identified that organizer-sensitive API routes still depended on the local prototype cookie session.
- Prototype cookies are useful for UI flow gating, but they are not a trustworthy API authorization source because browser clients can edit them.

Local changes completed:

1. Replaced prototype-cookie API authorization with verified Supabase Bearer token authorization for:
   - `POST /api/events`
   - `POST /api/orders/review`
   - `POST /api/orders/verify`
   - `GET /api/export/attendees`
   - `GET /api/export/finance`
2. Added app-user lookup by `users.auth_user_id`.
3. Added event management checks using the verified Supabase auth user id.
4. Updated organizer UI callers to attach the current Supabase access token.
5. Changed Excel exports from naked `window.location.href` downloads to authenticated `fetch` + Blob downloads.
6. Removed obsolete cookie-based API helper functions to reduce the chance of future misuse.
7. Added a payment review state guard so review writes only update registrations currently in `payment_submitted`.

Local verification:

- `npm run verify`: passed.
- `npm run build`: pending after this log update.

Remaining:

- Page-level route protection still uses the prototype cookie bridge and should be replaced by a durable Supabase SSR/session strategy before production.
- The clean Supabase project still needs live execution of the new RPC and validation scripts.

## 2026-07-16 Clean Dev RPC Integration Retest Attempt

Reason:

- `supabase/migrations/20260705000100_api_rate_limits.sql` added the service-role-only `consume_rate_limit` RPC.
- `tests/integration/rpc/rate-limit.test.mts` is ready to verify that the RPC counts requests atomically for the service role and rejects anonymous callers.
- README and repository docs still mark the newer rate-limit integration coverage as ready to run after the clean validation project has the migration applied.

Commands attempted:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=oxbrxkllftyevlzmiydt npm run test:integration:rpc
curl -I https://oxbrxkllftyevlzmiydt.supabase.co
```

Observed result:

- In the Codex sandbox, Supabase DNS lookup failed with `getaddrinfo ENOTFOUND`.
- With escalated network access, DNS resolved but TLS failed before a secure connection was established:
  - Node/Supabase client: `ECONNRESET`
  - curl: `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`
- Default `npm run test:integration:rpc` without the live switches still skipped all live suites successfully, confirming the accidental-live-run guard remains active.

Conclusion:

- This was a network reachability failure from the Codex execution environment, not a database assertion failure.
- The live status of the newer `consume_rate_limit` integration test remains pending until the clean dev/staging Supabase project is reachable from a normal terminal or browser network.

## 2026-07-19 Clean Dev Recovery and Full Integration Closure

Environment:

- Supabase project: `gatherup-commercial-v01-validation`
- Project ref: `oxbrxkllftyevlzmiydt`
- Target marker: `clean-dev`

Actions and findings:

1. Confirmed the validation project was paused and restored it from the Supabase Dashboard.
2. Confirmed terminal access after restoration with a public API request and a service-role read-only query.
3. Applied `20260717000000_create_event_atomic.sql`; Supabase SQL Editor returned `Success. No rows returned.`
4. The first real event-creation run exposed schema drift in the older validation database: `event_organizers` lacked the `event_organizer_status` enum and the `status`, `accepted_at`, and `declined_at` columns already present in the frozen repository baseline.
5. Added and applied the idempotent `20260719000000_reconcile_event_organizer_lifecycle.sql` migration. It creates the enum when absent, adds the lifecycle columns, and backfills `accepted_at` for active collaborators.
6. Re-ran `event-creation.test.mts`: 4/4 passed, covering anonymous rejection, complete transactional creation, duplicate public-code rejection, and invalid-input rollback.
7. The first full suite then exposed the previously documented missing `consume_rate_limit` migration. Applied `20260705000100_api_rate_limits.sql` and verified the service-role-only rate-limit RPC independently: 2/2 passed.
8. A subsequent production build exposed application drift against the canonical schema: three data adapters still selected the intentionally absent `events.registered_count` column. Added and applied `20260719000100_public_event_registration_counts.sql`, then moved public and participant reads to its aggregate-only RPC. The event-creation suite verified that an anonymous caller receives the new event's count without access to registration rows: 4/4 passed.
9. Re-ran the complete live suite:

```text
tests 25
suites 5
pass 25
fail 0
```
10. Completed a browser smoke test with a temporary confirmed Supabase Auth user. The create wizard successfully wrote a real event, then exposed a PostgREST ambiguity in the organizer workspace because `event_organizers` now has both `user_id` and `invited_by` relationships to `users`. Updated the adapter to select `users:users!event_organizers_user_id_fkey(...)`; after hot reload, the new activity management workspace rendered the event, owner, finance setup, and `event.created` audit entry successfully.

Validated boundaries:

- Concurrent payment review, check-in, and seat-lock races allow exactly one winner.
- Atomic event creation writes event, owner collaborator, finance settings, optional collection-code version, and audit log together.
- Public and unlisted event capacity usage is derived from active registration quantities through a narrow aggregate RPC instead of a denormalized event column.
- Registration capacity and duplicate-registration protection remain correct.
- Payment review, check-in, and refund RPC state transitions complete with audit behavior.
- The distributed rate-limit RPC counts atomically for `service_role` and rejects anonymous callers.
- Payment/refund proof Storage policies enforce ownership, role separation, malformed-path rejection, replacement blocking, and object immutability.

Conclusion:

- The clean-dev commercial v0.1 database baseline is reachable and the complete opt-in RPC/Storage suite passes 25/25.
- The schema drift found during validation is now represented by a committed, repeatable migration rather than an undocumented Dashboard-only repair.
