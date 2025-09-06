from connection import get_connection
import mysql.connector
from logger import get_logger  # ✅ use your shared logger
logger = get_logger("services.company")  # ✅ set meaningful service name


def insert_company(ticker_obj):
    try:
        info = ticker_obj.info
        conn = get_connection()
        cursor = conn.cursor()

        long_name = info.get("longName", "N/A")
        symbol = info.get("symbol", "N/A").upper()
        exchange = info.get("exchange", "N/A")

        # Detect NSE or BSE
        nse_code = symbol if ".NS" in symbol else None
        bse_code = symbol if ".BO" in symbol else None

        # ✅ Check if company already exists (nse_code, bse_code, or ticker)
        cursor.execute("""
            SELECT id FROM companies 
            WHERE nse_code = %s OR bse_code = %s OR ticker = %s
        """, (nse_code, bse_code, symbol))
        result = cursor.fetchone()

        if result:
            conn.close()
            logger.info(f"✅ Company {symbol} already exists with ID {result[0]}")
            return result[0]

        # ✅ Insert new company
        query = """
            INSERT INTO companies (
                name, ticker, nse_code, bse_code, exchange, country, sector,
                industry, market_cap, website, full_time_employees
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            long_name,
            symbol,
            nse_code,
            bse_code,
            exchange,
            info.get("country", "N/A"),
            info.get("sector", "N/A"),
            info.get("industry", "N/A"),
            info.get("marketCap", 0),
            info.get("website", "N/A"),
            info.get("fullTimeEmployees", 0)
        )

        cursor.execute(query, values)
        conn.commit()
        company_id = cursor.lastrowid
        logger.info(f"✅ Inserted company {symbol} with ID {company_id}")

        return company_id

    except mysql.connector.IntegrityError as e:
        if e.errno == 1062:
            logger.warning(f"⚠️ Duplicate entry for {symbol}, falling back to select.")
            cursor.execute("SELECT id FROM companies WHERE ticker = %s", (symbol,))
            result = cursor.fetchone()
            return result[0] if result else None
        else:
            logger.error(f"❌ MySQL integrity error: {e}")
            raise

    except Exception as e:
        logger.error(f"❌ Failed to insert company {symbol}: {e}")
        return None

    finally:
        conn.close()
