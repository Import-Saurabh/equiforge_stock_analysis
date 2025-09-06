# server/routes/nifty50.py
from flask import Blueprint, jsonify
from server.services.nifty50_utils import extract_nifty50_tickers # ✅ Use absolute import
import yfinance as yf

nifty50_bp = Blueprint("nifty50", __name__)

@nifty50_bp.route("/nifty50")
def get_nifty50_data():
    print("🔔 /api/nifty50 route hit")
    tickers = extract_nifty50_tickers()
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

    return jsonify(data)