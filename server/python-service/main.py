from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv
import os
import yfinance as yf

# Load environment
load_dotenv()

from services.financial import insert_items
from services.cashflow import get_moneycontrol_cashflow
from services.Ratio import get_moneycontrol_ratios
from services.company import insert_company
from services.save_nse_price_history import save_nse_price_history
from services.save_bse_price_history import save_bse_price_history
from connection import get_connection
from logger import get_logger

# ✅ New import for CORS
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
logger = get_logger("main")

# ✅ Add CORS middleware (only change)
# Update your CORS middleware in main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000","http://localhost:5001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)
print("🔍 DB_HOST used:", os.getenv("DB_HOST"))

@app.middleware("http")
async def verify_internal_token(request: Request, call_next):
    token = request.headers.get("x-internal-token")
    allowed_paths = ["/docs", "/openapi.json"]

    # ✅ Skip preflight (CORS)
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path not in allowed_paths:
        if token != os.getenv("INTERNAL_API_SECRET"):
            logger.warning(f"Unauthorized access attempt to {request.url.path}")
            raise HTTPException(status_code=403, detail="Unauthorized")

    logger.info(f"Incoming request: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

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
            logger.info(f"✅ Company {base_ticker} already exists with ID {company_id}")
            conn.close()
            return company_id

        yf_ticker = yf.Ticker(ticker)
        company_id = insert_company(yf_ticker)
        logger.info(f"✅ Inserted new company for {base_ticker} with ID {company_id}")
        conn.close()
        return company_id

    except Exception as e:
        logger.error(f"❌ get_or_create_company_id() failed for {ticker}: {e}")
        return None


@app.get("/api/fallback/yfinance/{ticker}/{statement_type}")
def get_financial_statement(ticker: str, statement_type: str):
    try:
        logger.info(f"📥 Request: YFinance {statement_type} for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        if statement_type not in ["balance-sheet", "income-statement", "cash-flow"]:
            return {"success": False, "error": f"Unsupported statement_type '{statement_type}'"}

        success = insert_items(yf.Ticker(ticker), company_id, statement_type)
        logger.info(f"✅ YFinance {statement_type} inserted for {ticker}")
        return {"success": success}

    except Exception as e:
        logger.error(f"❌ Failed yfinance insert for {ticker}: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/fallback/moneycontrol/{ticker}")
def get_moneycontrol_cashflow_api(ticker: str):
    try:
        logger.info(f"📥 Request: Moneycontrol Cashflow for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = get_moneycontrol_cashflow(ticker, company_id)
        logger.info(f"✅ Moneycontrol Cashflow inserted for {ticker}")
        return {"success": success}

    except Exception as e:
        logger.error(f"❌ Moneycontrol Cashflow failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/fallback/moneycontrol/ratios/{ticker}")
def get_moneycontrol_ratios_api(ticker: str):
    try:
        logger.info(f"📥 Request: Moneycontrol Ratios for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = get_moneycontrol_ratios(ticker, company_id)
        logger.info(f"✅ Moneycontrol Ratios inserted for {ticker}")
        return {"success": success}
    except Exception as e:
        logger.error(f"❌ Ratios insert failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/fallback/nse-price-history/{ticker}")
def save_nse_price_history_api(ticker: str):
    try:
        logger.info(f"📥 Request: NSE price history for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = save_nse_price_history(ticker, company_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"❌ NSE price history failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/fallback/bse-price-history/{ticker}")
def save_bse_price_history_api(ticker: str):
    try:
        logger.info(f"📥 Request: BSE price history for {ticker}")
        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "Unable to resolve or insert company"}

        success = save_bse_price_history(ticker, company_id)
        return {"success": success}
    except Exception as e:
        logger.error(f"❌ BSE price history failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/fallback/full-load/{ticker}")
def full_data_load(ticker: str):
    try:
        logger.info(f"🚀 Full Load Triggered for {ticker}")
        results = {}

        company_id = get_or_create_company_id(ticker)
        if not company_id:
            return {"success": False, "error": "❌ Unable to resolve or insert company"}

        results["company_id"] = company_id
        results["nse_price_history"] = save_nse_price_history(ticker, company_id)
        results["bse_price_history"] = save_bse_price_history(ticker, company_id)
        results["moneycontrol_cashflow"] = get_moneycontrol_cashflow(ticker, company_id)
        results["moneycontrol_ratios"] = get_moneycontrol_ratios(ticker, company_id)

        ticker_obj = yf.Ticker(ticker)
        results["yfinance_balance_sheet"] = insert_items(ticker_obj, company_id, "balance-sheet")
        results["yfinance_income_statement"] = insert_items(ticker_obj, company_id, "income-statement")

        logger.info(f"✅ Full load complete for {ticker}")
        return {"success": True, "details": results}

    except Exception as e:
        logger.error(f"❌ Full load failed for {ticker}: {e}")
        return {"success": False, "error": str(e)}
