import requests
import re
from bs4 import BeautifulSoup
from connection import get_connection
from logger import get_logger  # ✅ using your previous logger file

logger = get_logger("services.cashflow")

def _get_moneycontrol_url(company_name):
    try:
        search_url = "https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php"
        params = {
            "classic": "true",
            "query": company_name,
            "type": "1",
            "format": "json"
        }
        res = requests.get(search_url, params=params, timeout=10)
        res.raise_for_status()
        results = res.json()
        if not results:
            return None
        slug = results[0]['link_src'].split('/')[-2].lower()
        sc_id = results[0]['sc_id']
        return f"https://www.moneycontrol.com/financials/{slug}/cash-flowVI/{sc_id}#{sc_id}"
    except Exception as e:
        logger.warning(f"URL search failed: {str(e)}")
        return None

def _parse_cashflow_table(soup):
    table = soup.find("table", class_="mctable1")
    if not table:
        logger.error("No cash flow table found")
        return None

    rows = table.find_all("tr")
    if len(rows) < 3:
        logger.error("Cash flow table structure is unexpected")
        return None

    header_cells = rows[0].find_all("td")[1:-1]
    years = []
    for cell in header_cells:
        match = re.search(r'\d{2}', cell.get_text())
        if match:
            year_suffix = int(match.group())
            year_full = 2000 + year_suffix if year_suffix < 50 else 1900 + year_suffix
            years.append(f"{year_full}-03-31")

    data_by_year = {year: {} for year in years}

    ratio_mapping = {
        'Net CashFlow From Operating Activities': 'operating_cashflow',
        'Net Cash Used In Investing Activities': 'capex',
    }

    for row in rows[2:]:
        cells = row.find_all("td")
        if len(cells) < len(years) + 1:
            continue

        label = cells[0].get_text(strip=True)
        if label not in ratio_mapping:
            continue

        key = ratio_mapping[label]
        for i, year in enumerate(years):
            value_text = cells[i + 1].get_text(strip=True)
            try:
                value = float(re.sub(r'[^\d.-]', '', value_text or '0'))
                data_by_year[year][key] = value
                logger.info(f"Found {label} ({year}): {value}")
            except ValueError:
                logger.warning(f"Couldn't parse {label} for {year}")

    final_data = {}
    for year, vals in data_by_year.items():
        if 'operating_cashflow' in vals and 'capex' in vals:
            vals['free_cash_flow'] = vals['operating_cashflow'] - vals['capex']
            final_data[year] = vals
        else:
            logger.warning(f"Missing required ratios for {year}: "
                           f"{set(['operating_cashflow', 'capex']) - set(vals.keys())}")

    return final_data

def get_moneycontrol_cashflow(ticker, company_id):
    try:
        url = _get_moneycontrol_url(ticker.replace('.NS', ''))
        if not url:
            logger.error("Could not find Moneycontrol URL")
            return False

        logger.info(f"Scraping from: {url}")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept-Language": "en-US,en;q=0.9"
        }
        res = requests.get(url, headers=headers, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')
        data_by_year = _parse_cashflow_table(soup)
        if not data_by_year:
            logger.error("No valid cash flow data parsed")
            return False

        conn = get_connection()
        try:
            cursor = conn.cursor()
            inserted = 0

            for fiscal_date, data in data_by_year.items():
                for item_name, item_value in data.items():
                    logger.info(f"Inserting {item_name} for {fiscal_date}: {item_value}")
                    cursor.execute("""
                        INSERT INTO cash_flow_items (company_id, fiscal_date, item_name, item_value)
                        VALUES (%s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE item_value = VALUES(item_value)
                    """, (
                        company_id,
                        fiscal_date,
                        item_name,
                        item_value
                    ))
                    inserted += 1

            conn.commit()
            logger.info(f"✅ Inserted {inserted} cash flow items for {ticker}")
            return True

        except Exception as e:
            logger.error(f"Database operation failed: {str(e)}")
            if conn:
                conn.rollback()
            return False
        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        return False
