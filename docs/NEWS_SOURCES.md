# News and Data Sources

This document lists external data sources used by the system.

Agents should build ingestion modules for these sources.

---

# Financial News APIs

## NewsAPI

Website:
https://newsapi.org

Capabilities:

- aggregated financial news
- keyword filtering
- source filtering

Example queries:

- inflation
- federal reserve
- china economy
- oil prices

Free tier:

- 100 requests per day

Example endpoint:

```text
GET https://newsapi.org/v2/everything?q=inflation&apiKey=API_KEY
```

---

## GDELT Project

Website:
https://www.gdeltproject.org/

Capabilities:

- global news coverage
- geopolitical event tracking
- sentiment scoring
- event classification

Coverage:

- 65 languages
- 100+ countries

Why useful:

- sanctions
- trade wars
- conflicts
- economic shocks

---

## Alpha Vantage News API

Website:
https://www.alphavantage.co/

Capabilities:

- financial news
- sentiment scoring
- asset tagging

Example query:

```text
function=NEWS_SENTIMENT
tickers=SPY,TSLA
topics=financial_markets
```

Free tier:

- 25 requests per day

---

## MarketAux API

Website:
https://www.marketaux.com/

Capabilities:

- financial news
- entity extraction
- sentiment analysis

Free tier:

- 100 requests per day

---

# RSS Feeds

RSS feeds are often the simplest ingestion method.

Recommended feeds:

- Reuters
- Financial Times
- CNBC

Advantages:

- completely free
- near real-time updates
- no rate limits

---

# Macroeconomic Data APIs

These APIs provide macro indicators used to contextualize news.

## FRED API

Federal Reserve Economic Data:
https://fred.stlouisfed.org/

Provides:

- GDP
- inflation
- interest rates
- unemployment
- yield curves

Example series:

- CPIAUCSL
- FEDFUNDS
- DGS10
- UNRATE

Free for research.

---

## Federal Reserve Primary Sources

Official Federal Reserve sources used for central-bank document ingestion.

Current coverage:

- Chair speeches via the official Fed RSS feed
- FOMC meeting minutes from the FOMC calendars page
- FOMC projections materials from the FOMC calendars page

Notes:

- These are primary-source documents rather than market-news articles.
- Content is stored in `OfficialAnnouncement`.
- Deduplication is based on `externalKey`, typically the canonical document URL.

---

## Regulatory Announcement Sources

Official regulatory sources currently used for regulatory-announcement ingestion.

Current coverage:

- SEC press-release RSS
- SEC speeches RSS
- FCA sitemap discovery for press releases and speeches
- WTO latest news RSS
- BIS / U.S. Commerce federal-register notices page

Notes:

- These are stored in `RegulatoryAnnouncement`.
- Deduplication is based on `externalKey`, typically the canonical document URL.
- Queue publication happens only after the database write succeeds.

---

## Trading Economics API

https://tradingeconomics.com/

Provides:

- economic calendar
- country indicators
- commodity prices

---

## World Bank API

https://data.worldbank.org/

Provides:

- GDP
- inflation
- population
- trade

Completely free.

---

## OECD API

https://data.oecd.org/

Provides:

- macro indicators
- labour market data
- economic outlook

---

# MVP Recommendation

For initial implementation prioritize:

1. NewsAPI
2. RSS feeds
3. GDELT

Macro APIs and central-bank sources can be expanded later.
