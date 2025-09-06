# server/nifty50_utils.py
import csv

def extract_nifty50_tickers():
    path = r"server\Nifty50csv\MW-NIFTY-50-31-Jul-2025.csv"
    tickers = []

    with open(path, newline='', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile)
        header = reader.fieldnames
        symbol_column = next((col for col in header if "SYMBOL" in col.upper()), None)

        for row in reader:
            symbol = row[symbol_column].strip().replace('"', '')
            if symbol.upper() != "NIFTY 50":
                tickers.append(symbol + ".NS")

    return tickers
