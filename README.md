# NAYAY-SETU

NAYAY-SETU is a React + Vite legal-support web app with:
- AI legal assistant popup
- Emergency SOS directory (India-focused)
- Lawyer discovery + registration + verification signals
- Community module
- Know Your Rights module
- Justice Router & Justice Desk (official-service routing + case/reminder workflow)
- Feedback form
- Login/Signup popup flow
- English/Hindi language toggle

## Tech Stack
- React
- Vite
- CSS
- `react-icons`
- LocalStorage for client-side persistence
- Node/Express API (for live AI + online web search)
- Optional MongoDB-backed Justice Desk persistence (`MONGODB_URI`)
- JWT-based API authentication for production-safe protected routes

## Main Features

### 1. Hero + Consultation Entry
- Main landing hero with CTA (`Start Free Consultation`)
- Opens AI legal assistant popup
- Smooth section navigation from navbar

### 2. AI Legal Assistant
- Opens as modal/popup component
- Supports short legal guidance style interactions
- Calls backend API for live AI answers (when configured)
- Falls back to local safety guidance if API is unavailable
- Can be opened from:
  - Hero CTA
  - Emergency card flow
- Integrated with emergency flow for fast help routing

### 3. Emergency SOS
- Separate emergency component from AI module
- India emergency numbers support (general + state-oriented data support)
- Quick-access emergency actions

### 4. Lawyers Directory (`LawyerHub`)
- Search by name/field/city
- Includes online listing search for lawyers outside local database
- Filters by legal category and city
- Category grouping:
  - Criminal Law
  - Family Law
  - Property Law
  - Corporate Law
  - Cyber Law
  - Labour Law
- Lawyer profile cards with:
  - Avatar image
  - Field/city/experience
  - Bar Council details
  - Verification badge
  - Call / Message / Schedule actions (for eligible profiles)

### 5. Lawyer Data Volume
- Base seed lawyers + generated mock lawyers
- Currently generated as **10 lawyers per field**
- Visible count shown in UI: `Showing X advocates (Total Y)`

### 6. Verification Model (Lawyer Profiles)
- Badge is displayed on profile (`Verified` / `Not Verified`)
- Detailed verification panel on badge click
- Checks include:
  - Manual doc verification
  - Bar Council enrollment check
  - eCourts check
  - Indian Kanoon check
  - Office presence
  - Reputation check
  - Red flags cleared
- Color-marked status indicators in panel (green/yellow/red style logic)

### 7. Lawyer Registration
- Register-as-lawyer flow integrated with auth modal flow
- Required registration inputs include:
  - Name, field, city, experience
  - Phone/email
  - Bar Council number + enrollment year + state council
  - Office address
  - Aadhaar number
  - Uploads: Bar Council card + Aadhaar card
- OTP verification simulation for:
  - Phone
  - Email

### 8. Authentication UI
- Login/Signup popup module
- Popup close button visibility enforced
- Scroll locking on modal open (background does not scroll)
- Role-aware auth state:
  - `user`
  - `lawyer`
  - `admin`

### 9. Navbar
- Brand name clickable to Home
- Menu routes:
  - Home
  - Services
  - About
  - Feedback
- Notification panel
- Language selector (English/Hindi only)
- Smooth custom scroll behavior to sections
- Dashboard and logout controls shown for logged-in users

### 10. Services Section
- Service cards for:
  - Lawyers
  - Our Community
  - Emergency
  - Know Your Rights
- Card interactions open relevant modules

### 11. Access Model (Free vs Login Required)
- Free (no login required):
  - AI Legal Assistant
  - Emergency support
  - Lawyer browsing/filtering/profile preview
- Login required for advanced actions:
  - Contact lawyer (`Call`, `Message`, `Schedule`)
  - Community interactions
  - Know Your Rights advanced actions (save/download)

### 12. Dashboards
- User Dashboard:
  - Saved lawyers, appointments, rights bookmarks (demo cards)
- Lawyer Dashboard:
  - Profile status, leads, appointments (demo cards)
- Admin Dashboard:
  - Users, verification queue, feedback reports (demo cards)

### 13. Justice Router & Compliance Layer
- Official-service routing for eCourts / eFiling / NJDG / legal-aid pathways
- Domain trust checks for official judiciary-related links
- Justice Desk APIs for:
  - case tracking items
  - reminder items
  - AI-generated next-step plan per tracked case
- Compliance policy endpoint for legal positioning and source-attribution guardrails
- Clear legal notice: platform guidance is informational, not formal legal advice

### 13. How It Works + FAQ + About + Feedback
- Dedicated informational sections for user guidance
- Feedback form flow included in page navigation

### 14. Responsive UI
- Mobile-first adjustments across navbar, cards, forms, and popups
- Modal and card layouts adapt for smaller screens

## Project Structure
- `frontend/` - Vite app root
- `frontend/src/App.jsx` - App shell, landing page composition, route-state wiring
- `frontend/src/features/*` - Feature modules for about, assistant, auth, community, dashboard, emergency, feedback, justice, lawyers, legal, and rights
- `frontend/src/shared/layout/*` - Shared layout pieces like navbar, hero, footer, and profile drawer
- `frontend/src/shared/home/*` - Shared homepage sections like cards, sticky SOS, FAQ, guided flows, and impact stats
- `frontend/src/assets/Images/*` - Active frontend media assets
- `frontend/src/context/AuthContext.jsx` - Global auth state and role access
- `frontend/src/services/legalApi.js` - Frontend API client
- `frontend/src/utils/*` - Shared browser utilities
- `backend/` - Backend root
- `backend/server/index.js` - Express API entry point
- `backend/server/catalog/justiceCatalog.js` - Official-service catalog and routing logic
- `backend/server/stores/*` - File or Mongo-backed persistence stores for auth, community, justice desk, and policies
- `backend/server/data/*.json` - Local persistence files for backend development
- `backend/scripts/api-smoke.mjs` - API smoke test harness
- `docs/PROJECT_STRUCTURE.md` - High-level frontend/backend categorization reference

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Install
```bash
npm install
```

### Environment Setup (for live AI + online search)
Create `.env` in project root:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=development
PORT=8787
TRUST_PROXY=false
SERVE_STATIC=false
CORS_ALLOWED_ORIGINS=
RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=180
HEAVY_RATE_LIMIT_MAX=40
JWT_SECRET=your_strong_random_secret
JWT_EXPIRES_IN=12h
REFRESH_TOKEN_EXPIRES_IN=14d
ENABLE_WEB_SEARCH=false
ENABLE_DEMO_SOCIAL_AUTH=false
ENABLE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
OPENAI_MODERATION_MODEL=omni-moderation-latest
COMMUNITY_WRITE_RATE_LIMIT_MAX=36
COMMUNITY_POST_COOLDOWN_MS=30000
COMMUNITY_COMMENT_COOLDOWN_MS=12000
COMMUNITY_REPORT_COOLDOWN_MS=8000
COMMUNITY_MAX_REPORTS_PER_HOUR=20
COMMUNITY_REPORT_AUTO_HIDE_THRESHOLD=3
ENABLE_COMMUNITY_CAPTCHA=false
RECAPTCHA_SECRET_KEY=
VITE_COMMUNITY_CAPTCHA_ENABLED=false
VITE_RECAPTCHA_SITE_KEY=
MONGODB_URI=
MONGODB_DB_NAME=nayay_setu
MONGODB_COLLECTION_JUSTICE_DESK=justice_desks
```

Notes:
- If `OPENAI_API_KEY` is missing, assistant still works with local fallback guidance.
- Online lawyer/rights search uses backend web search endpoint.
- `NODE_ENV=production` enables stricter runtime checks.
- `TRUST_PROXY=true` should be set when running behind a reverse proxy/load balancer.
- `SERVE_STATIC=true` serves `dist` from the Express server (single-process deploy).
- `CORS_ALLOWED_ORIGINS` is a comma-separated allowlist for browser cross-origin API calls.
- `RATE_LIMIT_WINDOW_MS` controls rate-limit window (in ms).
- `API_RATE_LIMIT_MAX` applies per-IP to all `/api/*` routes.
- `HEAVY_RATE_LIMIT_MAX` applies per-IP to `/api/assistant/query`.
- `JWT_SECRET` must be set in production for secure token signing.
- `REFRESH_TOKEN_EXPIRES_IN` controls refresh-session lifetime (supports `m`, `h`, `d`, ex: `14d`).
- `ENABLE_WEB_SEARCH=false` keeps compliance mode on (recommended for production unless legal review approves web scraping/search behavior).
- `ENABLE_DEMO_SOCIAL_AUTH=false` is recommended. Set to `true` only for explicit local demo/testing of email-based social sign-in simulation.
- `ENABLE_GOOGLE_AUTH=true` enables real Google ID token auth endpoint.
- `GOOGLE_CLIENT_ID` must match your Google OAuth Web client ID on backend.
- `VITE_GOOGLE_CLIENT_ID` must match the same client ID on frontend.
- `OPENAI_MODERATION_MODEL` controls moderation model for community safety checks.
- `COMMUNITY_*` rate/cooldown vars control anti-spam write/report throttling.
- `ENABLE_COMMUNITY_CAPTCHA=true` enforces captcha on community post/comment submissions.
- `RECAPTCHA_SECRET_KEY` is required when captcha enforcement is enabled.
- `VITE_COMMUNITY_CAPTCHA_ENABLED=true` turns on frontend captcha token generation.
- `VITE_RECAPTCHA_SITE_KEY` must be the frontend site key paired with `RECAPTCHA_SECRET_KEY`.
- `MONGODB_URI` is optional; if absent/unavailable, Justice Desk falls back to file storage (`server/data/justice-desk-db.json`).

### Run Dev Server
```bash
npm run dev
```

### Run Backend API
```bash
npm run server
```

### Run Frontend + Backend Together
```bash
npm run dev:full
```

### Build
```bash
npm run build
```

### Run Local Quality Check
```bash
npm run check
```

### API Smoke Test
```bash
npm run test:api
```

### Preview Production Build
```bash
npm run preview
```

## Production Deployment Checklist
1. Set required server env vars:
   - `NODE_ENV=production`
   - `JWT_SECRET` (strong random value, required)
   - `CORS_ALLOWED_ORIGINS` (if frontend runs on a different domain)
   - `TRUST_PROXY=true` (if behind proxy)
   - `SERVE_STATIC=true` (if API server should serve frontend build)
2. Build frontend assets:
```bash
npm run build
```
3. Start backend in production:
```bash
npm run start
```
4. Verify liveness/readiness:
   - `GET /api/health`
   - `GET /api/ready`

## API Ops Endpoints
- `GET /api/health` - Liveness check and model/key visibility flags.
- `GET /api/ready` - Readiness check including community data dependency availability.

## Justice Router / Desk API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/social`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/sessions`
- `GET /api/admin/users` (admin token required)
- `GET /api/admin/policies` (admin token required)
- `POST /api/admin/policies/publish` (admin token required)
- `POST /api/admin/policies/activate/:versionId` (admin token required)
- `GET /api/compliance/policy`
- `GET /api/justice/services`
- `POST /api/justice/route`
- `GET /api/justice/link/verify?url=...`
- `GET /api/justice/legal-aid`
- `GET /api/justice/njdg-insights`
- `POST /api/justice/case-plan`
- `GET /api/justice/desk/:userId`
- `POST /api/justice/desk/:userId/cases`
- `PATCH /api/justice/desk/:userId/cases/:caseId`
- `DELETE /api/justice/desk/:userId/cases/:caseId`
- `POST /api/justice/desk/:userId/reminders`
- `PATCH /api/justice/desk/:userId/reminders/:reminderId`
- `DELETE /api/justice/desk/:userId/reminders/:reminderId`
- `GET /api/justice/desk/me` (auth-protected self route)
- `POST /api/justice/desk/me/cases` (auth-protected self route)
- `PATCH /api/justice/desk/me/cases/:caseId` (auth-protected self route)
- `DELETE /api/justice/desk/me/cases/:caseId` (auth-protected self route)
- `POST /api/justice/desk/me/reminders` (auth-protected self route)
- `PATCH /api/justice/desk/me/reminders/:reminderId` (auth-protected self route)
- `DELETE /api/justice/desk/me/reminders/:reminderId` (auth-protected self route)
- `POST /api/assistant/query/stream` (NDJSON live status/result stream)

## Demo Accounts

Demo users are seeded in backend auth storage (`server/data/auth-users.json`) on first server run.

Use these credentials in Login:

- User
  - Username: `demo_user`
  - Email: `user@nayaysetu.in`
  - Password: `User@123`
  - Role: `user`

- Lawyer
  - Username: `demo_lawyer`
  - Email: `lawyer@nayaysetu.in`
  - Password: `Lawyer@123`
  - Role: `lawyer`

- Admin
  - Username: `demo_admin`
  - Display Name: `Abhishek Yadav`
  - Email: `admin@nayaysetu.in`
  - Password: `Admin@123`
  - Role: `admin`

Notes:
- You can login using either username or email.
- If demo accounts are removed from auth storage, restart backend to reseed defaults.

## Data & Persistence Notes
- Lawyer registrations are stored in browser `localStorage`
- Default/generated lawyers are merged with user-added entries
- OTP in current implementation is demo/client-side logic
- Auth users are stored in `server/data/auth-users.json`
- Refresh sessions are stored in `server/data/auth-sessions.json`
- Active legal policy versions + policy audit are stored in `server/data/policy-store.json`
- Client keeps current profile/access/refresh tokens in browser storage for API auth

## Important Disclaimer
- This project provides legal-information UX and workflow support.
- It is not a substitute for licensed legal advice in real cases.
- Lawyer verification indicators are application-level checks and should be independently validated where required.

## How To Test Live AI + Core Features
1. Start both services with `npm run dev:full`.
2. Open AI Assistant and ask a legal query.
3. Watch live status updates in composer notice (input validation, attachment processing, context fetch, AI generation). This confirms real-time backend processing via `/api/assistant/query/stream`.
4. Verify mode tag:
: `ai` means OpenAI live response.
: `fallback-*` means local fallback path (no key/error/compliance mode limitation).
5. Test social auth:
: Google button uses real Google ID token flow (requires both Google client ID env vars).
: Facebook/X/LinkedIn remain demo email-based flow unless their OAuth providers are added.
