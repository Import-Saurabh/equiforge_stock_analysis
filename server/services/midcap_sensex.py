import yfinance as yf
from flask import Blueprint,jsonify

bp = Blueprint('midcap_sensex', __name__)

@bp.route('/midcap_sensex', methods=['GET'])
def fetch_midcap_data():
    ticker = yf.Ticker("^NSEMDCP50")  # Midcap Nifty 50 Index
    data = ticker.history(period="1d", interval="1m")
    last = data.tail(1).iloc[0]
    return {
        "name": "Midcap Nifty",
        "value": round(last["Close"], 2),
        "change": round(last["Close"] - last["Open"], 2),
        "change_percent": round((last["Close"] - last["Open"]) / last["Open"] * 100, 2),
    }
