# GatherUp

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=flat-square&logo=capacitor&logoColor=white)

GatherUp is an event management and ticketing platform for organizer teams that need one reliable workflow from registration to payout reconciliation.

Built with Next.js, React, Supabase, and Capacitor, it combines organizer operations, participant registration, payment-proof review, and audit-friendly status transitions in a single product surface.

For local development, install dependencies and run the app with `npm install` and `npm run dev`. To configure backend connectivity, copy `.env.example` to `.env.local` and fill in environment values before testing authenticated flows.

For iOS packaging, run `npm run mobile:build` to produce and sync web assets, then open the native workspace with `npx cap open ios`.

Additional product and engineering notes are documented in [`/docs/index-v0.1.md`](/docs/index-v0.1.md).

<sub>Every state and money-critical action should be traceable.</sub>
