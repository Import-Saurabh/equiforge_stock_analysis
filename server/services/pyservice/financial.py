from connection import get_connection
import pandas as pd
from logger import get_logger  # ✅ Use shared logger module
logger = get_logger("services.financial")  # ✅ Consistent logger tag

def insert_items(ticker, company_id, statement_type):
    try:
        if statement_type == 'balance-sheet':
            data = ticker.balance_sheet
            table = "balance_sheet_items"
        elif statement_type == 'income-statement':
            data = ticker.financials
            table = "income_statement_items"
        elif statement_type == 'cash-flow':
            data = ticker.cashflow
            table = "cash_flow_items"
        else:
            logger.error(f"❌ Unknown statement type: {statement_type}")
            return False

        if data.empty:
            logger.warning(f"⚠️ {statement_type} data empty for {ticker.ticker}")
            return False

        # Transpose to have dates as rows
        data = data.T
        conn = get_connection()
        cursor = conn.cursor()
        inserted = 0

        for date, row in data.iterrows():
            fiscal_date = pd.to_datetime(date).strftime('%Y-%m-%d')
            for field, value in row.items():
                if value is None or (isinstance(value, float) and pd.isna(value)):
                    continue
                try:
                    cursor.execute(f"""
                        INSERT INTO {table} (company_id, fiscal_date, item_name, item_value)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE item_value = VALUES(item_value)
                    """, (company_id, fiscal_date, str(field), float(value)))
                    inserted += 1
                except Exception as e:
                    logger.error(f"❌ Failed inserting {field} for {fiscal_date}: {str(e)}")
                    continue

        conn.commit()
        conn.close()
        logger.info(f"✅ Inserted {inserted} items into {table} for {ticker.ticker}")
        return True

    except Exception as e:
        logger.error(f"❌ Error in insert_items({statement_type}): {str(e)}", exc_info=True)
        return False
