# server/data_fetcher.py
import yfinance as yf

def fetch_stock_data(tickers):
    data = []
    for t in tickers:
        try:
            info = yf.Ticker(t).info
            data.append({
                "symbol": t,
                "name": info.get("shortName"),
                "price": info.get("regularMarketPrice"),
                "change_percent": info.get("regularMarketChangePercent"),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "sector": info.get("sector"),
            })
        except Exception as e:
            print(f"Error fetching {t}: {e}")
    return data
