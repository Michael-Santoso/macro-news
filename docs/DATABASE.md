# Database Schema

Database: PostgreSQL
ORM: Prisma

---

# RawArticle

Stores raw articles fetched from news sources.

```prisma
model RawArticle {
  id String @id @default(cuid())

  source String
  title String
  url String @unique
  description String?
  content String?
  author String?

  publishedAt DateTime
  fetchedAt DateTime @default(now())

  processingStatus ProcessingStatus @default(PENDING)

  events Event[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

# MacroObservation

Stores point-in-time macro indicator values fetched from FRED.

```prisma
model MacroObservation {
  id String @id @default(cuid())

  seriesId String
  observationDate DateTime
  value String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([seriesId, observationDate])
}
```

---

# MacroObservationCatalog

Stores metadata for tracked FRED series.

```prisma
model MacroObservationCatalog {
  seriesId String @id

  category String
  shortDescription String
  longDescription String?
  frequency String?
  units String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("MacroObservationCatalog")
}
```

---

# CentralBankDocument

Stores official primary-source central-bank documents.

Active ingestion currently produces:

- `FOMC_MINUTES`
- `FOMC_PROJECTIONS`
- `CHAIR_SPEECH`

Uniqueness is enforced by `externalKey`.

```prisma
model CentralBankDocument {
  id String @id @default(cuid())

  institution CentralBankInstitution
  documentType CentralBankDocumentType

  externalKey String @unique
  title String
  url String?
  pdfUrl String?
  sourceFeed String?
  speaker String?

  publishedAt DateTime
  meetingDate DateTime?

  description String?
  content String?
  contentHash String?

  processingStatus ProcessingStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

# ProcessingStatus

```prisma
enum ProcessingStatus {
  PENDING
  PROCESSING
  PROCESSED
  FAILED
}
```

---

# Event

Represents a structured macro event extracted from an article.

```prisma
model Event {
  id String @id @default(cuid())

  rawArticleId String
  rawArticle RawArticle @relation(fields: [rawArticleId], references: [id])

  theme String
  region String?
  assetClass AssetClass?

  sentiment Sentiment?
  impactLabel ImpactLabel?

  summary String?

  eventDate DateTime?

  entities Entity[]
}
```

---

# Entity

```prisma
model Entity {
  id String @id @default(cuid())

  name String
  type String

  eventId String
  event Event @relation(fields: [eventId], references: [id])
}
```

---

# Enums

```prisma
enum AssetClass {
  STOCK
  BOND
  FOREX
  COMMODITY
  MACRO
}

enum Sentiment {
  RISK_ON
  RISK_OFF
  HAWKISH
  DOVISH
  NEUTRAL
}

enum ImpactLabel {
  LOW
  MEDIUM
  HIGH
}

enum CentralBankInstitution {
  FEDERAL_RESERVE
}

enum CentralBankDocumentType {
  FOMC_MEETING
  FOMC_MINUTES
  FOMC_PROJECTIONS
  CHAIR_SPEECH
}
```
