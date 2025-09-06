# price.py

from connection import get_connection
import pandas as pd
from logger import get_logger  # ✅ Use shared logger
logger = get_logger("services.price")  # ✅ Tag this service

def insert_price_history(history_df: pd.DataFrame, company_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    # Reset index so 'Date' becomes a column
    history_df = history_df.reset_index()
    history_df['Date'] = pd.to_datetime(history_df['Date']).dt.date

    inserted = 0
    skipped = 0

    for _, row in history_df.iterrows():
        price_date = row['Date']

        # Skip if already exists
        cursor.execute("""
            SELECT 1 FROM stock_price_history
            WHERE company_id = %s AND price_date = %s
            LIMIT 1
        """, (company_id, price_date))

        if cursor.fetchone():
            skipped += 1
            continue

        query = """
            INSERT INTO stock_price_history 
            (company_id, price_date, open, high, low, close, adj_close, volume)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            company_id,
            price_date,
            float(row.get('Open', 0) or 0),
            float(row.get('High', 0) or 0),
            float(row.get('Low', 0) or 0),
            float(row.get('Close', 0) or 0),
            float(row.get('Adj Close', 0) or 0),
            int(row.get('Volume', 0) or 0)
        )

        try:
            cursor.execute(query, values)
            inserted += 1
        except Exception as e:
            logger.error(f"❌ Failed to insert price on {price_date}: {str(e)}")

    conn.commit()
    conn.close()

    logger.info(f"✅ Inserted {inserted} new prices for company_id={company_id}")
    logger.info(f"⚠️ Skipped {skipped} already existing prices for company_id={company_id}")
