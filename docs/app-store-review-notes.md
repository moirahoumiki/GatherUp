# GatherUp App Store Review Notes (Phase 5)

Last updated: 2026-08-17

## 1) Test account (placeholder)

- Email: `reviewer_test@gatherup.app` (placeholder)
- Password: `Replace-With-Real-Review-Password` (placeholder)
- Notes: Test account must be pre-seeded with at least one organizer-capable profile and one attendee flow sample.

## 2) App overview

GatherUp is an offline event management and ticketing workflow tool, not a simple website wrapper.
It supports organizer operations (event setup, order review, refund workflow, seat/attendance management)
and attendee operations (registration, payment proof upload, order tracking, waitlist flow).

## 3) Native capabilities used in iOS app

- Sign in with Apple (native auth flow)
- Apple Push Notifications (APNs) for order/event updates
- Camera upload (payment proof and event material upload)
- Native share sheet for event links and pages
- Deep links to open in-app event detail/registration pages

## 4) Payment and business model clarification

- GatherUp does **not** process payments through Apple In-App Purchase.
- The app is used for offline event ticketing workflows where payment is handled outside the app between attendee and organizer.
- In-app actions focus on order management, proof submission/review, and notification workflows.

## 5) Account deletion compliance

- In-app account deletion entry is provided in user settings (`/me` account panel).
- User must pass a two-step confirmation flow.
- Deletion API anonymizes profile data, records an audit log, and removes auth account.
- Retention policy: 30-day soft-delete window for operational records before permanent purge.

## 6) Additional reviewer guidance

- If Apple reviewer needs a clean scenario, provide one sample event with:
  - one pending registration
  - one approved registration
  - one refund request
- Legal pages are publicly accessible:
  - Privacy: `/privacy`
  - Terms: `/terms`
  - Support: `/support`