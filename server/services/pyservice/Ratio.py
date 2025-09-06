import time
import requests
import re
from bs4 import BeautifulSoup
from connection import get_connection
from datetime import datetime
from logger import get_logger  # ✅ Import shared logger

logger = get_logger("services.Ratio")  # ✅ Tagged service logger


def _get_moneycontrol_url(company_name):
    try:
        search_url = "https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php"
        params = {"query": company_name, "type": "1", "format": "json"}
        res = requests.get(search_url, params=params, timeout=10)
        res.raise_for_status()
        results = res.json()
        if not results:
            return None
        return f"https://www.moneycontrol.com/financials/{results[0]['link_src'].split('/')[-2].lower()}/ratiosVI/{results[0]['sc_id']}#{results[0]['sc_id']}"
    except Exception as e:
        logger.warning(f"🔎 URL search failed: {str(e)}")
        return None


def _parse_ratio_table(soup):
    table = soup.find("table", class_="mctable1")
    if not table:
        logger.error("❌ No ratio table found")
        return None

    rows = table.find_all("tr")
    if not rows or len(rows) < 2:
        logger.error("❌ Ratio table structure unexpected")
        return None

    header_cells = rows[0].find_all(["td", "th"])
    years = [cell.get_text(strip=True) for cell in header_cells[1:]]
    fiscal_dates = []
    for y in years:
        try:
            year_number = int(re.search(r'\d+', y).group())
            full_year = 2000 + year_number if year_number < 100 else year_number
            fiscal_dates.append(f"{full_year}-03-31")
        except Exception:
            fiscal_dates.append(None)

    ratio_mapping = {
        'Basic EPS (Rs.)': 'eps',
        'Net Profit Margin (%)': 'profit_margin',
        'Return on Networth / Equity (%)': 'roe',
        'Total Debt/Equity (X)': 'debt_to_equity'
    }

    data_by_year = {fy: {} for fy in fiscal_dates if fy}

    for row in rows[1:]:
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue

        ratio_name = cells[0].get_text(strip=True)
        if ratio_name not in ratio_mapping:
            continue

        for i, fy in enumerate(fiscal_dates):
            if not fy or i + 1 >= len(cells):
                continue
            value_text = cells[i + 1].get_text(strip=True)
            if not re.search(r'\d', value_text):  # skip dashes or blanks
                continue
            try:
                value = float(re.sub(r'[^\d.-]', '', value_text))
                if '%' in value_text:
                    value /= 100
                data_by_year[fy][ratio_mapping[ratio_name]] = value
                logger.info(f"✅ Found {ratio_name} ({fy}): {value}")
            except Exception:
                logger.warning(f"⚠️ Couldn't parse {ratio_name} for {fy}")

    required = ['eps', 'roe', 'debt_to_equity', 'profit_margin']
    for fy, ratios in list(data_by_year.items()):
        if not all(r in ratios for r in required):
            logger.warning(f"⚠️ Missing required ratios: {set(required) - set(ratios.keys())} for year {fy}")
            del data_by_year[fy]

    return data_by_year


def get_moneycontrol_ratios(ticker, company_id):
    try:
        ratios_url = _get_moneycontrol_url(ticker.replace('.NS', ''))
        if not ratios_url:
            logger.error("❌ Could not find Moneycontrol URL")
            return False

        logger.info(f"🌐 Scraping from: {ratios_url}")
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9"
        }
        res = requests.get(ratios_url, headers=headers, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')
        data_by_year = _parse_ratio_table(soup)
        if not data_by_year:
            logger.error("❌ No valid ratios parsed")
            return False

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT close FROM nse_stock_price_history 
            WHERE company_id = %s AND close IS NOT NULL
            ORDER BY price_date DESC LIMIT 1
        """, (company_id,))
        price_row = cursor.fetchone()
        price = float(price_row[0]) if price_row else None
        cursor.close()

        cursor = conn.cursor()
        inserted = 0
        for fy, ratios in data_by_year.items():
            eps = ratios.get("eps")
            pe_ratio = None

            if price is not None and eps and eps != 0:
                pe_ratio = price / float(eps)
                logger.info(f"📊 {fy} | EPS={eps}, Price={price}, P/E={pe_ratio:.2f}")
            else:
                logger.info(f"⚠️ Skipping PE calculation for {fy} due to missing data: EPS={eps}, Price={price}")

            cursor.execute("""
                INSERT INTO financial_ratios 
                (company_id, fiscal_date, pe_ratio, roe, 
                 debt_to_equity, profit_margin, eps)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    pe_ratio = VALUES(pe_ratio),
                    roe = VALUES(roe),
                    debt_to_equity = VALUES(debt_to_equity),
                    profit_margin = VALUES(profit_margin),
                    eps = VALUES(eps)
            """, (
                company_id,
                fy,
                pe_ratio,
                ratios.get('roe'),
                ratios.get('debt_to_equity'),
                ratios.get('profit_margin'),
                eps
            ))
            inserted += 1

        conn.commit()
        conn.close()
        logger.info(f"✅ Inserted/Updated {inserted} ratio entries for company_id={company_id}")
        return True

    except Exception as e:
        logger.error(f"❌ Error processing ratios for {ticker}: {str(e)}", exc_info=True)
        return False
