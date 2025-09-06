import yfinance as yf
from connection import get_connection
from logger import get_logger  # ✅ Use centralized logger

logger = get_logger("services.save_nse_price_history")  # ✅ Named for context

def save_nse_price_history(ticker: str, company_id: int):
    try:
        if not ticker.endswith(".NS"):
            ticker += ".NS"

        yf_ticker = yf.Ticker(ticker)
        df = yf_ticker.history(period="5y", interval="1d")

        if df.empty:
            logger.warning(f"⚠️ No NSE data found for {ticker}")
            return False

        # Normalize column names (just in case)
        df.columns = [col.strip().replace(" ", "_").lower() for col in df.columns]

        conn = get_connection()
        cursor = conn.cursor()
        insert_count = 0

        for date, row in df.iterrows():
            cursor.execute("""
                INSERT INTO nse_stock_price_history 
                (company_id, price_date, open, high, low, close, adj_close, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    open = VALUES(open),
                    high = VALUES(high),
                    low = VALUES(low),
                    close = VALUES(close),
                    adj_close = VALUES(adj_close),
                    volume = VALUES(volume)
            """, (
                company_id,
                date.date(),
                float(row.get("open", 0.0)),
                float(row.get("high", 0.0)),
                float(row.get("low", 0.0)),
                float(row.get("close", 0.0)),
                float(row.get("adj_close", 0.0)),
                int(row.get("volume", 0))
            ))
            insert_count += 1

        conn.commit()
        conn.close()
        logger.info(f"✅ Inserted {insert_count} NSE price rows for {ticker}")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to save NSE price history for {ticker}: {e}", exc_info=True)
        return False
