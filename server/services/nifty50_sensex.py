import yfinance as yf

def fetch_nifty50_data():
    ticker = "^NSEI"
    data = yf.Ticker(ticker).history(period="1d", interval="1m")
    if data.empty:
        return {"error": "Failed to fetch Nifty 50 data"}
    
    latest = data.iloc[-1]
    previous = data.iloc[-2]

    return {
        "name": "Nifty 50",
        "symbol": "^NSEI",
        "price": round(latest["Close"], 2),
        "change": round(latest["Close"] - previous["Close"], 2),
        "change_percent": round((latest["Close"] - previous["Close"]) / previous["Close"] * 100, 2)
    }
