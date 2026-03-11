# Macro News Backend

Backend API for macro news aggregator built with Express, TypeScript, and Prisma.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Update database connection strings in `.env` for Supabase:

- `DATABASE_URL`: transaction pooler URL on port `6543` with `?pgbouncer=true`
- `DIRECT_URL`: session/direct URL supported by your Supabase connect settings for Prisma CLI work

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Run database migrations:

```bash
npm run prisma:migrate
```

## Development

Start the development server:

```bash
npm run bootstrap:dashboard
npm run dev
```

The server will run on `http://localhost:3000`

Run `npm run bootstrap:dashboard` before `npm run dev` when you want to prefill the database with dashboard-facing content instead of waiting for the scheduler's first ingestion cycle. The bootstrap script backfills the last 30 days by default and accepts `-- --days=30` to change the window.

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run bootstrap:dashboard` - One-shot fetch/process/score bootstrap for dashboard data
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── index.ts           # Express server entry point
│   ├── lib/
│   │   └── prisma.ts      # Prisma client instance
│   ├── routes/            # API routes
│   ├── services/          # Business logic layer
│   ├── jobs/              # Background jobs
│   ├── scheduler/         # Job scheduler
│   └── types/             # TypeScript types
├── .env.example           # Environment variables template
└── package.json
```

## API Endpoints

- `GET /health` - Health check
- `GET /db-test` - Test database connection
