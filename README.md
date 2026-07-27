# Nysonian ERP — Mobile App

React Native (Expo) mobile client for the Nysonian ERP, for **Android and iOS**.
This is the employee self-service app: it starts at a **login screen**, opens an
**employee dashboard**, and supports **logout**.

> **Phase 1 (current): design & UX with dummy data.** No backend is required.
> The screens render entirely from local mock data so the UI/UX can be reviewed
> and demoed. The API layer is already shaped to the ERP conventions so Phase 2
> is a drop-in swap (see *Roadmap* below).

## Tech stack

- **Expo (SDK 51)** + **expo-router** (file-based navigation, typed routes)
- **TypeScript** (strict), path alias `@/*` → `src/*`
- `expo-linear-gradient`, `react-native-svg` (custom charts), `@expo/vector-icons`
- No external UI kit — a small in-house design system in `src/theme` + `src/components`

## Getting started

```bash
cd native-mobile-app
npm install          # or: yarn

npx expo start       # opens the dev server + QR code
# then:
#   press a  -> Android emulator
#   press i  -> iOS simulator (macOS)
#   or scan the QR with the Expo Go app on a physical device
```

### Login (real backend + OTP)

Login is wired to the production ERP (`https://erp.nysonian.com`) with
two-factor auth:

1. Enter **work email + password** → `api/store.php?action=login_form_submit`
   (DB-validated; server starts a PHP session via cookie).
2. A **6-digit OTP** is sent via Slack (if the employee has a `slack_id`) or
   email → `action=send_otp` (`method=send`).
3. Enter the code → `action=send_otp` (`method=verify`) → you're in.

The native fetch cookie jar carries the session across requests. A unified
mobile dispatcher (`/api/mobile.php`) mirrors these calls under clean action
names — see `api/MOBILE_API_PLAN.md`.

## Project structure

```
native-mobile-app/
├── app/                      # expo-router routes
│   ├── _layout.tsx           # root stack + providers (Auth, SafeArea, Gesture)
│   ├── index.tsx             # redirect: dashboard if signed in, else login
│   ├── login.tsx             # login screen
│   └── (tabs)/               # authenticated bottom-tab area
│       ├── _layout.tsx       # tab bar (auth-guarded)
│       ├── dashboard.tsx     # employee dashboard (main screen)
│       ├── attendance.tsx    # 14-day attendance + trend
│       ├── leaves.tsx        # leave balance + requests
│       └── profile.tsx       # profile + LOGOUT
├── src/
│   ├── theme/                # design tokens (colors, spacing, radii, type, shadow)
│   ├── components/           # Card, StatCard, Button, BarChart, Avatar, Badge, …
│   ├── context/AuthContext.tsx
│   ├── hooks/useDashboard.ts
│   ├── api/                  # client + config (ERP dispatcher shape)
│   ├── data/dummy.ts         # Phase 1 mock data
│   └── types/                # shared domain types
└── assets/                   # icon / splash placeholders
```

## What the dashboard shows

The widgets mirror the web ERP's `modules/dashboard/employee.php`:

- **Profile header** — name, photo, status, role/designation, department,
  company, manager.
- **Quick stats** — late comings (this month), work modality, tenure, biometric ID.
- **Leave & PTO** — available vs. accrued/pro-rated balance, consumed, and
  approved / pending / rejected request counts (Days or Hours per locale).
- **Working hours** — last 7–14 days trend chart + per-day check-in/out log.
- **Recent leave requests** with status badges.
- **Recent activity** log feed.
- **Alerts** — pending policy acknowledgements and incomplete-profile nudges.

## API layer (ERP rules)

`src/api/client.ts` routes every call through the ERP dispatcher pattern
(`api/mobile.php?action=<action>`, POST body, `{ status, message, data }`
envelope). The dashboard and IP-cam screens now read **live** data from
`employee/dashboard` and `ipcam/list`. Set `USE_DUMMY = true` (in
`src/api/config.ts`) only to demo the UI offline against local mock data.

## Roadmap

| Phase | Scope |
|-------|-------|
| **1 (done)** | Full design system + screens (dashboard, attendance, leaves, profile, IP cameras) on **dummy data**. |
| **1.5 (done)** | **Real login + OTP 2FA** against the production ERP. IP Cameras page with single/multi/template modes + fullscreen. |
| **2 (done)** | Live data endpoints wired in (`employee/dashboard`, `ipcam/list`, `ipcam/stream`); `USE_DUMMY = false`. Dashboard + IP-cam screens now read from the backend. |
| **3** | Bearer-token auth (expo-secure-store), push notifications, leave/requisition submission, offline cache, biometric unlock, in-tile HLS playback (expo-av). |

### Backend (server side)

A dedicated mobile dispatcher already exists: **`/api/mobile.php`** with the
plan in **`/api/MOBILE_API_PLAN.md`**. Auth + OTP are implemented (reusing the
existing store actions); the data endpoints are catalogued there and built per
phase, returning the standard `{ status, message, data }` shape.
```
