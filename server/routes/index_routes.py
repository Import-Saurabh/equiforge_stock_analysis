from flask import Blueprint, jsonify
from services.nifty50_sensex import fetch_nifty50_data
from services.sensex_service import fetch_sensex_data
from services.banknifty_sensex import fetch_banknifty_data

index_bp = Blueprint("index", __name__)

@index_bp.route("/nifty50", methods=["GET"])
def get_nifty50_data():
    data = fetch_nifty50_data()
    return jsonify(data)

@index_bp.route("/sensex", methods=["GET"])
def get_sensex_data():
    data = fetch_sensex_data()
    return jsonify(data)

@index_bp.route("/banknifty", methods=["GET"])
def get_banknifty_data():
    data = fetch_banknifty_data()
    return jsonify(data)
