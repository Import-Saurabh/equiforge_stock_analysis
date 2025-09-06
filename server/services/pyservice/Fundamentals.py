# fundamental.py
import time
import requests
import re
from bs4 import BeautifulSoup
import yfinance as yf
from logger import get_logger

logger = get_logger("services.Fundamental")

def _get_moneycontrol_url(company_name):
    """
    Get MoneyControl URL for a company
    """
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
    """
    Parse the ratios table from MoneyControl HTML
    """
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

def get_fresh_fundamentals(ticker):
    """
    Fetch fresh fundamentals data from MoneyControl without database insertion
    Returns: dict with fundamentals data or None if failed
    """
    try:
        # Normalize ticker for MoneyControl search
        company_name = ticker.replace('.NS', '').replace('.BO', '')
        ratios_url = _get_moneycontrol_url(company_name)
        
        if not ratios_url:
            logger.error("❌ Could not find Moneycontrol URL")
            return None

        logger.info(f"🌐 Scraping fresh fundamentals from: {ratios_url}")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
        
        res = requests.get(ratios_url, headers=headers, timeout=15)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, 'html.parser')
        data_by_year = _parse_ratio_table(soup)
        
        if not data_by_year:
            logger.error("❌ No valid ratios parsed")
            return None

        # Get the latest available data (most recent fiscal year)
        latest_year = max(data_by_year.keys()) if data_by_year else None
        if not latest_year:
            return None

        latest_ratios = data_by_year[latest_year]
        
        # Get additional fundamentals from yfinance
        yf_data = {}
        try:
            yf_ticker = yf.Ticker(ticker)
            info = yf_ticker.info
            
            yf_data = {
                'marketCap': info.get('marketCap'),
                'peRatio': info.get('trailingPE'),
                'pbRatio': info.get('priceToBook'),
                'dividendYield': info.get('dividendYield'),
                'bookValue': info.get('bookValue'),
                'faceValue': info.get('faceValue')
            }
            
            # Calculate P/E if not available and we have EPS
            if not yf_data['peRatio'] and latest_ratios.get('eps'):
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                if current_price and latest_ratios['eps'] != 0:
                    yf_data['peRatio'] = current_price / latest_ratios['eps']
            
        except Exception as yf_error:
            logger.warning(f"⚠️ Yahoo Finance data unavailable: {yf_error}")
            yf_data = {}

        # Combine MoneyControl ratios with yfinance data
        fundamentals = {
            "marketCap": yf_data.get('marketCap'),
            "roe": latest_ratios.get('roe'),
            "peRatio": yf_data.get('peRatio'),
            "eps": latest_ratios.get('eps'),
            "pbRatio": yf_data.get('pbRatio'),
            "dividendYield": yf_data.get('dividendYield'),
            "industryPE": None,  # Not available from these sources
            "bookValue": yf_data.get('bookValue'),
            "debtToEquity": latest_ratios.get('debt_to_equity'),
            "faceValue": yf_data.get('faceValue'),
            "profitMargin": latest_ratios.get('profit_margin'),
            "source": "MoneyControl + Yahoo Finance",
            "fiscalYear": latest_year
        }

        logger.info(f"✅ Successfully fetched fresh fundamentals for {ticker}")
        return fundamentals

    except requests.RequestException as req_err:
        logger.error(f"❌ Network error fetching fundamentals for {ticker}: {req_err}")
        return None
    except Exception as e:
        logger.error(f"❌ Error fetching fresh fundamentals for {ticker}: {str(e)}", exc_info=True)
        return None