# server/__init__.py
from flask import Flask
from flask_cors import CORS
from server.routes.nifty50 import nifty50_bp
from server.services import banknifty_sensex,midcap_sensex,nifty50_sensex,sensex_service
def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Register blueprints
    app.register_blueprint(nifty50_bp, url_prefix="/api")
    app.register_blueprint(sensex_service.bp, url_prefix="/api")
    app.register_blueprint(banknifty_sensex.bp, url_prefix="/api")
    app.register_blueprint(midcap_sensex.bp, url_prefix="/api")

    print("Registered routes:", app.url_map)  # Debugging
    return app
