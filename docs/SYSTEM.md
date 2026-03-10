# Macro News Intelligence System

## Goal

Build a system that converts **financial news and macroeconomic data into structured events** that can be queried, analyzed, and visualized.

The system will:

1. Fetch financial news
2. Store raw articles
3. Extract structured events
4. Track macroeconomic themes
5. Provide answers via chatbot and dashboard

---

# Architecture Overview

System pipeline:

Scheduler
→ Data Ingestion
→ Raw Storage
→ Event Extraction
→ Structured Database
→ Theme Analysis
→ Retrieval / RAG
→ Dashboard

Pipeline diagram:

Scheduler
→ News APIs / RSS / Macro APIs
→ RawArticles Table
→ Processing Pipeline
→ Events + Entities Tables
→ ThemeStats
→ UI + Chatbot

---

# Core Modules

## 1 News Ingestion

Fetch news from external sources.

Sources include:

- NewsAPI
- GDELT
- Alpha Vantage News
- MarketAux
- RSS feeds (Reuters, CNBC, FT)

Articles are normalized and stored in the **RawArticles table**.

This is the **first system component to implement.**

---

## 2 Macroeconomic Data Ingestion

Fetch economic indicators.

Sources:

- FRED API
- Trading Economics
- World Bank
- OECD

These sources provide macro signals such as:

GDP
inflation
interest rates
unemployment

These datasets help contextualize news events.

---

## 3 Event Extraction

Convert raw news into structured events.

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

inflation
bank crisis
oil supply shocks
trade war
sanctions

Metrics include:

- article frequency
- mention acceleration
- cross-region spread

---

## 5 Knowledge Layer

Events are stored with relationships:

event → theme
event → entity
event → region
event → asset class

This enables querying and linking developments over time.

---

## 6 Retrieval Layer

Users can ask questions such as:

"What events drove inflation concerns this week?"

The system retrieves relevant events and generates an answer using RAG.

---

# MVP Scope

The MVP will include:

✓ News ingestion
✓ Raw article database
✓ Event extraction
✓ Theme classification
✓ Basic dashboard

Advanced features (optional):

- knowledge graph
- advanced event linking
- real-time ingestion

---

# Development Priority

1 News ingestion
2 Database schema
3 Event extraction
4 Theme tracking
5 Chatbot / RAG
6 UI
