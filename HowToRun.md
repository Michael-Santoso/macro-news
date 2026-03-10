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
npm run dev
```

Backend runs at:

```bash
http://localhost:3000
```

# Database

Open Docker Desktop first, then run:

```bash
docker compose up -d
```

PostgreSQL runs at:

```bash
localhost:5433
```

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
