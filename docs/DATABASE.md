# Database Schema

Database: PostgreSQL
ORM: Prisma

---

# RawArticle

Stores raw articles fetched from news sources.

Fields:

- source
- title
- url
- description
- content
- author
- publishedAt
- fetchedAt
- processingStatus

Prisma model:

```
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

# ProcessingStatus

```
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

```
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

```
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

Asset class:

```
enum AssetClass {
  STOCK
  BOND
  FOREX
  COMMODITY
  MACRO
}
```

Market stance:

```
enum Sentiment {
  RISK_ON
  RISK_OFF
  HAWKISH
  DOVISH
  NEUTRAL
}
```

Impact label:

```
enum ImpactLabel {
  LOW
  MEDIUM
  HIGH
}
```
