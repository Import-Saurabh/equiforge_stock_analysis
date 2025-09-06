from flask import Blueprint, jsonify
import yfinance as yf

bp = Blueprint('sensex', __name__)

@bp.route('/sensex', methods=['GET'])
def get_sensex_data():
    try:
        ticker = yf.Ticker("^BSESN")
        data = ticker.history(period="1d", interval="1m")

        if data.empty:
            return jsonify({"error": "No data available"}), 404

        last = data.tail(1).iloc[0]
        open_price = last["Open"]
        close_price = last["Close"]

        change = close_price - open_price
        change_percent = (change / open_price) * 100

        return jsonify({
            "symbol": "^BSESN",
            "price": round(close_price, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
