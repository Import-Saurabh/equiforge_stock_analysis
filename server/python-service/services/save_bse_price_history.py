import yfinance as yf
from connection import get_connection
from logger import get_logger  # ✅ Use your central logger

logger = get_logger("services.save_bse_price_history")  # ✅ Service-tagged logger

def save_bse_price_history(ticker: str, company_id: int):
    try:
        # ✅ Append .BO suffix if not present
        if not ticker.endswith(".BO"):
            ticker += ".BO"

        yf_ticker = yf.Ticker(ticker)
        df = yf_ticker.history(period="5y", interval="1d")

        if df.empty:
            logger.warning(f"⚠️ No BSE data found for {ticker}")
            return False

        # Normalize columns
        df.columns = [col.strip().replace(" ", "_").lower() for col in df.columns]

        conn = get_connection()
        cursor = conn.cursor()

        insert_count = 0

        for date, row in df.iterrows():
            cursor.execute("""
                INSERT INTO bse_stock_price_history 
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
        logger.info(f"✅ Inserted {insert_count} BSE price rows for {ticker}")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to save BSE price history for {ticker}: {e}", exc_info=True)
        return False
