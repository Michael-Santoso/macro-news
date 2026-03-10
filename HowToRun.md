# Simple Guide To Run

## 1) Start Database

Open Docker Desktop first, then run:

```bash
docker compose up -d
```

PostgreSQL runs at:

```bash
localhost:5433
```

## 2) Run Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend runs at:

```bash
http://localhost:3000
```

## 3) Optional: Prisma Studio

```bash
cd backend
npm run prisma:studio
```

Prisma Studio runs at:

```bash
http://localhost:5555
```

## 4) Optional: Run NewsAPI Ingestion

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

## Frontend Note

Frontend is not initialized yet in this repo (no `frontend/package.json` yet).
