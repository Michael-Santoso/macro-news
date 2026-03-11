# Simple Guide To Run

# Frontend

```bash
cd frontend
npm install
npm run dev
```

### Frontend runs at:

```bash
http://localhost:3001
```

# Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run bootstrap:dashboard
npm run dev
```

For Supabase, set both `DATABASE_URL` and `DIRECT_URL` first.
Use the transaction pooler URL for `DATABASE_URL` and the session/direct URL for `DIRECT_URL`.

Backend runs at:

```bash
http://localhost:3000
```

`npm run bootstrap:dashboard` backfills roughly the last 30 days of supported source data, processes it into dashboard theme events, and refreshes theme scores before the scheduler starts. Run it again any time you want to prefill the database manually.

# (Optional) Database UI

```bash
cd backend
npx prisma studio
```

### Database UI runs at:

```bash
http://localhost:5555
```

# (Optional) Run NewsAPI Ingestion

Set your key first:

```bash
# PowerShell
$env:NEWS_API_KEY="your_newsapi_key"
```

Then run:

```bash
cd backend
npm run ingest:newsapi
```

If you want the frontend to look populated right away, prefer:

```bash
cd backend
npm run bootstrap:dashboard
```

You can change the backfill window:

```bash
cd backend
npm run bootstrap:dashboard -- --days=30
```
