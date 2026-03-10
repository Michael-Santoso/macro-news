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

# OfficialAnnouncement

Stores official central-bank and monetary-policy primary-source announcements.

Active ingestion currently produces:

- `MINUTES`
- `PROJECTIONS`
- `SPEECH`
- `RATE_DECISION`
- `MONETARY_POLICY_STATEMENT`
- `PRESS_CONFERENCE_TRANSCRIPT`
- `MONETARY_POLICY_REPORT`
- `LIQUIDITY_OPERATION`
- `RESERVE_REQUIREMENT_RATIO`
- `PROPERTY_SUPPORT`

Uniqueness is enforced by `externalKey`.

```prisma
model OfficialAnnouncement {
  id String @id @default(cuid())

  institution AnnouncementInstitution
  region AnnouncementRegion
  documentType AnnouncementDocumentType

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

# RegulatoryAnnouncement

Stores official regulatory announcements and related primary-source documents.

Active ingestion currently produces records for:

- `SEC`
- `FCA`
- `WTO`
- `US_COMMERCE`

Uniqueness is enforced by `externalKey`.

```prisma
model RegulatoryAnnouncement {
  id String @id @default(cuid())

  institution RegulatoryInstitution
  jurisdiction RegulatoryJurisdiction
  category RegulatoryCategory
  documentType RegulatoryDocumentType
  sourceType RegulatorySourceType

  externalKey String @unique
  title String
  url String?
  pdfUrl String?
  sourceFeed String?

  publishedAt DateTime
  effectiveAt DateTime?
  commentDeadline DateTime?

  summary String?
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

enum AnnouncementInstitution {
  FEDERAL_RESERVE
  EUROPEAN_CENTRAL_BANK
  BANK_OF_ENGLAND
  BANK_OF_JAPAN
  PEOPLES_BANK_OF_CHINA
}

enum AnnouncementRegion {
  US
  EUROPE
  UNITED_KINGDOM
  JAPAN
  CHINA
}

enum AnnouncementDocumentType {
  RATE_DECISION
  MONETARY_POLICY_STATEMENT
  PRESS_CONFERENCE_TRANSCRIPT
  MINUTES
  PROJECTIONS
  MONETARY_POLICY_REPORT
  SPEECH
  LIQUIDITY_OPERATION
  ASSET_PURCHASE_PROGRAM
  RESERVE_REQUIREMENT_RATIO
  PROPERTY_SUPPORT
}

enum RegulatoryInstitution {
  SEC
  FCA
  MAS
  ESMA
  WTO
  US_COMMERCE
  EUROPEAN_COMMISSION
}

enum RegulatoryJurisdiction {
  US
  UK
  SG
  EU
  GLOBAL
}

enum RegulatoryCategory {
  FINANCIAL_REGULATION
  TRADE_POLICY
  GEOPOLITICAL_REGULATION
  AI_REGULATION
  BANK_CAPITAL
  ENERGY_POLICY
  ENVIRONMENTAL_RULES
  GENERAL_REGULATION
}

enum RegulatoryDocumentType {
  PRESS_RELEASE
  SPEECH
  CONSULTATION
  PROPOSED_RULE
  FINAL_RULE
  GUIDANCE
  CIRCULAR
  ENFORCEMENT_ACTION
  FAQ
  REPORT
  NOTICE
}

enum RegulatorySourceType {
  RSS
  API
  HTML
  PDF
}
```
