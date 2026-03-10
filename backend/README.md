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

3. Update `DATABASE_URL` in `.env` with your PostgreSQL connection string.

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
npm run dev
```

The server will run on `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
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
