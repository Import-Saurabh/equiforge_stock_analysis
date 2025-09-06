from fastapi import APIRouter, HTTPException
import yfinance as yf

router = APIRouter()

@router.get("/banknifty")
def fetch_banknifty_data():
    ticker = yf.Ticker("^NSEBANK")
    data = ticker.history(period="1d", interval="1m")

    if data.empty:
        raise HTTPException(status_code=404, detail="No data found")

    last = data.tail(1).iloc[0]
    return {
        "name": "Bank Nifty",
        "value": round(last["Close"], 2),
        "change": round(last["Close"] - last["Open"], 2),
        "change_percent": round((last["Close"] - last["Open"]) / last["Open"] * 100, 2),
    }
