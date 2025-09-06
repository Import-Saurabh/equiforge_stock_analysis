from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import yfinance as yf
import os
import time
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import pandas as pd
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
load_dotenv()

# app-specific helpers / services
from FilterPage import read_symbols_from_csv, get_top_movers_by_category
from connection import get_connection
from logger import get_logger
from pyservice.Fundamentals import get_fresh_fundamentals
from pyservice.financial import insert_items
from pyservice.cashflow import get_moneycontrol_cashflow
from pyservice.Ratio import get_moneycontrol_ratios
from pyservice.company import insert_company
from pyservice.save_nse_price_history import save_nse_price_history
from pyservice.save_bse_price_history import save_bse_price_history
from pyservice.balance import get_balance_sheet_data
# your new FinChart module
from pyservice.FinChart import get_financials as finchart_get_financials

# ENV secrets
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "supersecrettoken123")

# instantiate logger
logger = get_logger("ExploreAPI")

# FastAPI app
app = FastAPI(title="Market Data API", version="1.0")

# Allowed origins - add your frontend URLs here
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://yourfrontend.com"
]

# CORS setup - critical for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # for quick dev testing you can change to ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse({"error": "Too many requests, slow down"}, status_code=429)

# In-memory cache
cache = {}
CACHE_TTL = 60             # 1 minute for indices
MOVERS_CACHE_TTL = 1800    # 30 minutes for movers

def get_cached_data(key: str, fetch_func, ttl=CACHE_TTL):
    """Return cached data or fetch if expired."""
    now = time.time()
    if key in cache and (now - cache[key]["time"]) < ttl:
        return cache[key]["data"]
    
    try:
        data = fetch_func()
        cache[key] = {"time": now, "data": data}
        return data
    except Exception as e:
        logger.error(f"Error fetching data for {key}: {str(e)}")
        # Return cached data even if expired if available
        if key in cache:
            return cache[key]["data"]
        raise

# API key verification (for the marketdata endpoint)
def verify_api_key(request: Request):
    key = request.headers.get("x-api-key")
    if key != INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key")

# =============================
# Top Movers Implementation
# =============================

def get_top_movers(category=None, max_workers=20):
    try:
        csv_file = "nifty500_marketcap_cleaned.csv"
        symbols, category_dict = read_symbols_from_csv(csv_file)
        results = get_top_movers_by_category(symbols, category_dict, max_workers)
        
        if category:  # If specific category requested
            # Map frontend category names to backend categories
            category_mapping = {
                "Large Cap": "LargeCap",
                "Mid Cap": "MidCap",
                "Small Cap": "SmallCap"
            }
            backend_category = category_mapping.get(category)
            return results.get(backend_category, {"gainers": [], "losers": []})
        
        return results
    except Exception as e:
        logger.error(f"Error in get_top_movers: {str(e)}")
        return {
            "LargeCap": {"gainers": [], "losers": []},
            "MidCap": {"gainers": [], "losers": []},
            "SmallCap": {"gainers": [], "losers": []}
        }

# =======================
# Index Data Fetchers
# =======================

def fetch_nifty50():
    try:
        ticker = "^NSEI"
        data = yf.Ticker(ticker).history(period="1d", interval="1m")
        if data.empty or len(data) < 2:
            return {"error": "Failed to fetch Nifty 50 data"}
        
        latest = data.iloc[-1]
        previous = data.iloc[-2] if len(data) > 1 else latest
        change = latest["Close"] - previous["Close"]
        change_pct = (change / previous["Close"] * 100) if previous["Close"] else 0
        
        return {
            "name": "Nifty 50",
            "symbol": ticker,
            "value": round(latest["Close"], 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
        }
    except Exception as e:
        logger.error(f"Error fetching Nifty 50: {str(e)}")
        return {"error": str(e)}

def fetch_sensex():
    try:
        ticker = "^BSESN"
        data = yf.Ticker(ticker).history(period="1d", interval="1m")
        if data.empty or len(data) < 2:
            return {"error": "No data available"}
        
        latest = data.iloc[-1]
        previous = data.iloc[-2] if len(data) > 1 else latest
        change = latest["Close"] - previous["Close"]
        change_pct = (change / previous["Close"] * 100) if previous["Close"] else 0
        
        return {
            "name": "Sensex",
            "symbol": ticker,
            "value": round(latest["Close"], 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
        }
    except Exception as e:
        logger.error(f"Error fetching Sensex: {str(e)}")
        return {"error": str(e)}

def fetch_banknifty():
    try:
        ticker = "^NSEBANK"
        data = yf.Ticker(ticker).history(period="1d", interval="1m")
        if data.empty or len(data) < 2:
            return {"error": "No data found"}
        
        latest = data.iloc[-1]
        previous = data.iloc[-2] if len(data) > 1 else latest
        change = latest["Close"] - previous["Close"]
        change_pct = (change / previous["Close"] * 100) if previous["Close"] else 0
        
        return {
            "name": "Bank Nifty",
            "symbol": ticker,
            "value": round(latest["Close"], 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
        }
    except Exception as e:
        logger.error(f"Error fetching Bank Nifty: {str(e)}")
        return {"error": str(e)}

def fetch_midcap():
    try:
        ticker = "^NSEMDCP50"
        data = yf.Ticker(ticker).history(period="1d", interval="1m")
        if data.empty or len(data) < 2:
            return {"error": "Failed to fetch Midcap data"}
        
        latest = data.iloc[-1]
        previous = data.iloc[-2] if len(data) > 1 else latest
        change = latest["Close"] - previous["Close"]
        change_pct = (change / previous["Close"] * 100) if previous["Close"] else 0
        
        return {
            "name": "Midcap Nifty",
            "symbol": ticker,
            "value": round(latest["Close"], 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
        }
    except Exception as e:
        logger.error(f"Error fetching Midcap: {str(e)}")
        return {"error": str(e)}

# Middleware: require internal token only for internal endpoints
@app.middleware("http")
async def verify_internal_token(request: Request, call_next):
    # Allow CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path or ""
    # Define which paths should be considered internal and need a token
    internal_prefixes = ["/api/fallback", "/marketdata"]
    if any(path.startswith(prefix) for prefix in internal_prefixes):
        token = request.headers.get("x-internal-token")
        if token != INTERNAL_API_SECRET:
            logger.warning(f"Unauthorized access attempt to {path} (missing/invalid x-internal-token)")
            raise HTTPException(status_code=403, detail="Unauthorized")
    logger.info(f"Incoming request: {request.method} {path}")
    response = await call_next(request)
    return response

# Helper: resolve or insert company
def get_or_create_company_id(ticker: str):
    try:
        base_ticker = ticker.replace(".NS", "").replace(".BO", "")
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id FROM companies 
            WHERE ticker = %s OR nse_code = %s OR bse_code = %s
        """, (base_ticker, base_ticker, base_ticker))
        result = cursor.fetchone()

        if result:
            company_id = result[0]
            logger.info(f"Company {base_ticker} already exists with ID {company_id}")
            conn.close()
            return company_id

        yf_ticker = yf.Ticker(ticker)
        company_id = insert_company(yf_ticker)
        logger.info(f"Inserted new company for {base_ticker} with ID {company_id}")
        conn.close()
        return company_id

    except Exception as e:
        logger.error(f"get_or_create_company_id() failed for {ticker}: {e}")
        return None

# ======================
# Fallback / internal endpoints
# ======================

@app.get("/api/fallback/yfinance/{ticker}/{statement_type}")
def get_financial_statement(ticker: str, statement_type: str):
    try:
        logger.info(f"YFinance {statement_type} request for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        if statement_type not in ["balance-sheet", "income-statement", "cash-flow"]:
            return {"success": False, "error": f"Unsupported statement_type '{statement_type}'"}

        success = insert_items(yf.Ticker(ticker), company_id, statement_type)
        logger.info(f"YFinance {statement_type} inserted for {ticker}")
        return {"success": success}
    except Exception as e:
        logger.error(f"Failed yfinance insert for {ticker}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/fallback/moneycontrol/{ticker}")
def get_moneycontrol_cashflow_api(ticker: str):
    try:
        logger.info(f"Moneycontrol Cashflow request for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = get_moneycontrol_cashflow(ticker, company_id)
        logger.info(f"Moneycontrol Cashflow inserted for {ticker}")
        return {"success": success}
    except Exception as e:
        logger.error(f"Moneycontrol Cashflow failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/fallback/moneycontrol/ratios/{ticker}")
def get_moneycontrol_ratios_api(ticker: str):
    try:
        logger.info(f"Moneycontrol Ratios request for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = get_moneycontrol_ratios(ticker, company_id)
        logger.info(f"Moneycontrol Ratios inserted for {ticker}")
        return {"success": success}
    except Exception as e:
        logger.error(f"Ratios insert failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/fallback/nse-price-history/{ticker}")
def save_nse_price_history_api(ticker: str):
    try:
        logger.info(f"NSE price history request for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = save_nse_price_history(ticker, company_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"NSE price history failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/fallback/bse-price-history/{ticker}")
def save_bse_price_history_api(ticker: str):
    try:
        logger.info(f"BSE price history request for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = save_bse_price_history(ticker, company_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"BSE price history failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/history/{ticker}")
def get_price_history(ticker: str, period: str = "5y"):
    try:
        logger.info(f"Fetching {period} history for {ticker}")
        data = yf.Ticker(f"{ticker}.NS").history(period=period)

        candles = [
            {
                "date": str(idx.date()),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            }
            for idx, row in data.iterrows()
        ]

        return {"ticker": ticker, "candles": candles}
    except Exception as e:
        logger.error(f"History fetch failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}

# This was a stray decorator previously; removed earlier to avoid import errors.
# Now map the fundamentals endpoint explicitly:
@app.get("/api/fundamentals/{ticker}")
async def get_fundamentals(ticker: str):
    try:
        logger.info(f"Fetching fundamentals for {ticker}")
        data = get_fresh_fundamentals(ticker)   # ✅ use new function
        if not data:
            raise HTTPException(status_code=404, detail="No fundamentals found")
        return {"ticker": ticker, **data}
    except Exception as e:
        logger.error(f"Error fetching fundamentals for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/financials/{ticker}")
@limiter.limit("10/minute")
def api_financials(request: Request, ticker: str):
    """
    Returns: { ticker, quarterly: [...], yearly: [...] }
    Uses pyservice.FinChart.get_financials and caches result for 5 minutes.
    """
    try:
        return get_cached_data(f"financials_{ticker}", lambda: finchart_get_financials(ticker), ttl=300)
    except Exception as e:
        logger.error(f"api_financials failed for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.get("/api/balance-sheet/{ticker}")
@limiter.limit("10/minute")
async def get_balance_sheet(request: Request, ticker: str):
    """
    Returns balance sheet data for a ticker
    Format: { years: [], data: [{item: "", values: []}] }
    """
    try:
        # Normalize ticker format
        if not ticker.endswith(".NS") and not ticker.endswith(".BO"):
            ticker += ".NS"
            
        logger.info(f"Fetching balance sheet for {ticker}")
        data = get_balance_sheet_data(ticker)
        
        if not data:
            raise HTTPException(status_code=404, detail="No balance sheet data found")
            
        return data
    except Exception as e:
        logger.error(f"Error fetching balance sheet for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/fallback/full-load/{ticker}")
def full_data_load(ticker: str):
    try:
        logger.info(f"Full Load Triggered for {ticker}")
        results = {}

        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        results["company_id"] = company_id
        results["nse_price_history"] = save_nse_price_history(ticker, company_id)
        results["bse_price_history"] = save_bse_price_history(ticker, company_id)
        results["moneycontrol_cashflow"] = get_moneycontrol_cashflow(ticker, company_id)
        results["moneycontrol_ratios"] = get_moneycontrol_ratios(ticker, company_id)

        ticker_obj = yf.Ticker(ticker)
        results["yfinance_balance_sheet"] = insert_items(ticker_obj, company_id, "balance-sheet")
        results["yfinance_income_statement"] = insert_items(ticker_obj, company_id, "income-statement")

        logger.info(f"Full load complete for {ticker}")
        return {"success": True, "details": results}
    except Exception as e:
        logger.error(f"Full load failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}

# =======================
# Public Endpoints
# =======================

@app.get("/mkt/nifty50")
@limiter.limit("20/minute")
async def get_nifty50(request: Request):
    return get_cached_data("nifty50", fetch_nifty50)

@app.get("/mkt/sensex")
@limiter.limit("20/minute")
async def get_sensex(request: Request):
    return get_cached_data("sensex", fetch_sensex)

@app.get("/mkt/banknifty")
@limiter.limit("20/minute")
async def get_banknifty(request: Request):
    return get_cached_data("banknifty", fetch_banknifty)

@app.get("/mkt/midcap")
@limiter.limit("20/minute")
async def get_midcap_sensex(request: Request):
    return get_cached_data("midcap_sensex", fetch_midcap)

@app.get("/mkt/movers")
@limiter.limit("10/minute")
async def get_movers(request: Request, category: str = None):
    key = f"movers_{category or 'all'}"
    return get_cached_data(key, lambda: get_top_movers(category), ttl=MOVERS_CACHE_TTL)

@app.get("/marketdata", dependencies=[Depends(verify_api_key)])
async def get_marketdata(request: Request):
    return {
        "nifty50": get_cached_data("nifty50", fetch_nifty50),
        "sensex": get_cached_data("sensex", fetch_sensex),
        "banknifty": get_cached_data("banknifty", fetch_banknifty),
        "midcap_sensex": get_cached_data("midcap_sensex", fetch_midcap),
        "movers": get_cached_data("movers_all", lambda: get_top_movers(None), ttl=MOVERS_CACHE_TTL)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
