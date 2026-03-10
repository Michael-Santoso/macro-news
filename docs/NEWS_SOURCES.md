# News and Data Sources

This document lists external data sources used by the system.

Agents should build ingestion modules for these sources.

---

# Financial News APIs

## NewsAPI

Website
https://newsapi.org

Capabilities:

- aggregated financial news
- keyword filtering
- source filtering

Example queries:

inflation
federal reserve
china economy
oil prices

Free tier:

100 requests per day.

Example endpoint:

```
GET https://newsapi.org/v2/everything?q=inflation&apiKey=API_KEY
```

---

## GDELT Project

Website
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

GDELT already detects events such as:

sanctions
trade wars
conflicts
economic shocks

This reduces the need for custom classifiers.

---

## Alpha Vantage News API

Website
https://www.alphavantage.co/

Capabilities:

- financial news
- sentiment scoring
- asset tagging

Example query:

```
function=NEWS_SENTIMENT
tickers=SPY,TSLA
topics=financial_markets
```

Free tier:

25 requests/day.

---

## MarketAux API

Website
https://www.marketaux.com/

Capabilities:

- financial news
- entity extraction
- sentiment analysis

Free tier:

100 requests/day.

---

# RSS Feeds

RSS feeds are often the simplest ingestion method.

Recommended feeds:

Reuters
Financial Times
CNBC

Advantages:

- completely free
- real-time updates
- no rate limits

RSS parsing should be supported in ingestion modules.

---

# Macroeconomic Data APIs

These APIs provide macro indicators used to contextualize news.

---

## FRED API

Federal Reserve Economic Data

https://fred.stlouisfed.org/

Provides:

GDP
inflation
interest rates
unemployment
yield curves

Example series:

CPIAUCSL
FEDFUNDS
DGS10
UNRATE

Free for research.

---

## Trading Economics API

https://tradingeconomics.com/

Provides:

economic calendar
country indicators
commodity prices

---

## World Bank API

https://data.worldbank.org/

Provides:

GDP
inflation
population
trade

Completely free.

---

## OECD API

https://data.oecd.org/

Provides:

macro indicators
labour market data
economic outlook

---

# MVP Recommendation

For initial implementation prioritize:

1 NewsAPI
2 RSS feeds
3 GDELT

Macro APIs can be added later.
