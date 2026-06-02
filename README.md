# Mitigation Planner

Unofficial Final Fantasy XIV mitigation timeline planner.

Current beta scope:

- Next.js App Router, TypeScript, Tailwind CSS
- dnd-kit drag-and-drop placement
- Zustand local planner state
- published fight/template catalogue, including Dancing Mad Ultimate day-one prog
- manual mitigation ability metadata
- cooldown conflict and damage type warnings
- timeline paste import
- JSON import/export
- localStorage draft autosave
- FFLogs timeline/action import and common-usage sample builder
- Supabase saved plans, auth-gated saving, and share links

Not included yet: realtime collaboration, full XIVAPI-managed encounter catalogue, or official DMU FFLogs encounter mapping.

## FFLogs timeline import

FFLogs import uses the official API v2 with server-side OAuth client credentials. Add these to `.env.local` before using the import modal:

```bash
FFLOGS_CLIENT_ID=your-client-id
FFLOGS_CLIENT_SECRET=your-client-secret
FFLOGS_API_BASE_URL=https://www.fflogs.com/api/v2/client
FFLOGS_TOKEN_URL=https://www.fflogs.com/oauth/token
```

The app imports log-derived timeline candidates and observed damage. Observed damage may already include mitigation, shields, gear differences, vuln stacks, deaths, and party-specific conditions.

Do not commit `.env.local`. It is ignored by Git. Manually paste your real FFLogs client ID and client secret into `.env.local` on your machine:

```bash
FFLOGS_CLIENT_ID=your-real-client-id
FFLOGS_CLIENT_SECRET=your-real-client-secret
```

You can safely verify local setup without printing secret values:

```bash
npm run check:fflogs-env
npm run test:fflogs-auth
```

Both scripts only print present/missing or success/failure. They never print the client ID, client secret, or OAuth access token.

## Supabase saved plans and share links

Saved plans use Supabase Auth and server-side API routes. Configure these values in local `.env.local` and in Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.example
```

Run the Supabase SQL migrations in order:

1. `supabase/migrations/001_saved_plans.sql`
2. `supabase/migrations/002_dmu_day_one_prog.sql`

In Supabase Auth settings, add redirect URLs for local development and deployment:

```text
http://localhost:3000/**
https://your-vercel-domain.example/**
```

The service role key is only used in server-side routes. Do not expose it as a `NEXT_PUBLIC_` variable.

## Common usage overlay

The common usage overlay is inspired by the product behaviour of M-Spec-style action timelines, such as:

https://raalm.com/m-spec/timelinev2.html?boss=the-tyrant&spec=scholar-scholar

The app does not scrape M-Spec, does not scrape FFLogs rankings pages, and does not crawl public logs. It uses user-provided FFLogs reports, FFLogs API data, or manually pasted action timeline rows. Common usage is log-derived reference data; it may reflect speedkill, reclear, or group-specific strategies and may not be ideal for progression.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Fan project note

FINAL FANTASY XIV and all related official game assets, icons, names, and data are property of Square Enix. This is an unofficial fan project and is not affiliated with Square Enix.

Users should review and follow the official FFXIV Materials Usage License:

https://support.na.square-enix.com/rule.php?id=5382&tag=authc
