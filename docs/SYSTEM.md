# Macro News Intelligence System

## Goal

Build a system that converts financial news, macroeconomic data, central-bank primary sources, and regulatory announcements into structured events that can be queried, analyzed, and visualized.

The system will:

1. Fetch financial news
2. Store raw source documents
3. Extract structured events
4. Track macroeconomic themes
5. Provide answers via chatbot and dashboard

---

# Architecture Overview

System pipeline:

Scheduler
-> Data ingestion
-> Raw storage
-> Event extraction
-> Structured database
-> Theme analysis
-> Retrieval / RAG
-> Dashboard

Pipeline diagram:

Scheduler
-> News APIs / RSS / macro APIs / central-bank sources / regulatory sources
-> RawArticle + MacroObservation + OfficialAnnouncement + RegulatoryAnnouncement tables
-> Processing pipeline
-> Events + Entities tables
-> ThemeStats
-> UI + Chatbot

---

# Core Modules

## 1 News Ingestion

Fetch news from external sources.

Sources include:

- NewsAPI
- GDELT
- Alpha Vantage News
- MarketAux
- RSS feeds

Articles are normalized and stored in the `RawArticle` table.

---

## 2 Macroeconomic Data Ingestion

Fetch economic indicators.

Sources:

- FRED API
- Trading Economics
- World Bank
- OECD

These datasets help contextualize news events.

---

## 2.5 Official Announcement Ingestion

Fetch official central-bank documents, policy commentary, and related monetary-policy announcements.

Current coverage:

- Federal Reserve minutes, projections, and chair speeches
- European Central Bank rate decisions, press-conference materials, accounts, and speeches
- Bank of England MPC decisions, Monetary Policy Reports, and speeches
- Bank of Japan policy statements, outlook reports, and speeches
- People's Bank of China RRR, liquidity, policy-statement, and property-support pages

Announcements are stored in `OfficialAnnouncement` and queued only after the database write succeeds.

---

## 2.6 Regulatory Announcement Ingestion

Fetch official regulatory announcements and primary-source releases.

Current coverage:

- SEC press releases and speeches
- FCA press releases and speeches
- WTO latest news feed
- BIS / U.S. Commerce federal-register notices

Announcements are stored in `RegulatoryAnnouncement` and queued only after the database write succeeds.

---

## 3 Event Extraction

Convert raw source material into structured events.

Extraction outputs:

- theme
- country / region
- entities
- asset class
- sentiment / stance
- impact label
- event summary

---

## 4 Theme Tracking

Track macro themes such as:

- inflation
- bank crisis
- oil supply shocks
- trade war
- sanctions

Metrics include:

- article frequency
- mention acceleration
- cross-region spread

---

## 5 Knowledge Layer

Events are stored with relationships:

- event -> theme
- event -> entity
- event -> region
- event -> asset class

This enables querying and linking developments over time.

---

## 6 Retrieval Layer

Users can ask questions such as:

"What events drove inflation concerns this week?"

The system retrieves relevant events and generates an answer using RAG.

---

# MVP Scope

The MVP includes:

- [x] News ingestion
- [x] Raw article database
- [x] Event extraction
- [x] Theme classification
- [x] Basic dashboard

Advanced features:

- knowledge graph
- advanced event linking
- real-time ingestion

---

# Development Priority

1. News ingestion
2. Database schema
3. Event extraction
4. Theme tracking
5. Chatbot / RAG
6. UI
