# Backend Demo Runbook

Use this from `d:\Coding\macro-news\backend`.

## One-time setup

```powershell
npm install
npx prisma validate
npm run prisma:generate
npx prisma migrate deploy
npm run build
```

## Demo data refresh

Run these before the demo if you want the latest processed events and scores:

```powershell
npm run process:sources
npm run update:theme-scores
```

## Start the backend

```powershell
npm run dev
```

The API will be available at `http://localhost:3000`.

## Smoke test endpoints

Run these in another terminal:

```powershell
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db
curl "http://localhost:3000/api/v1/events?limit=5"
curl "http://localhost:3000/api/v1/themes?limit=10"
curl "http://localhost:3000/api/v1/themes/interest_rates?limit=5"
curl "http://localhost:3000/api/v1/macro/releases?limit=5"
```

## Demo checklist

- `process:sources` completes without failures.
- `update:theme-scores` upserts `ThemeScore` rows.
- `/api/v1/themes` returns persisted score fields like `weeklyMentions`, `momentumScore`, `heatLevel`, and `updatedAt`.
- `/api/v1/themes/:theme` returns current score data plus timeline/history.
- `/api/v1/events` returns paginated `ThemeEvent` rows.
- `/api/v1/macro/releases` returns the latest macro observations.
