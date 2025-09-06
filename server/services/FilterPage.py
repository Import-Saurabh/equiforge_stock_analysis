import yfinance as yf
import pandas as pd
from datetime import datetime
import time
from concurrent.futures import ThreadPoolExecutor, as_completed


def read_symbols_from_csv(file_path):
    df = pd.read_csv(file_path)
    df.columns = df.columns.str.strip()
    print("CSV columns:", df.columns.tolist())

    df = df[df['symbol'].notna()]
    df = df[~df['symbol'].str.contains(r"\s", regex=True)]

    symbols = df['symbol'].astype(str).str.strip().tolist()
    symbols = [sym + ".NS" for sym in symbols]  # Append .NS for yfinance

    # Create mapping from symbol to category
    symbol_to_category = dict(zip(df['symbol'], df['category']))

    return symbols, symbol_to_category


def fetch_data_for_symbol(symbol, category_dict, max_retries=3):
    base_symbol = symbol.replace(".NS", "")
    category = category_dict.get(base_symbol, "Unknown")

    for attempt in range(1, max_retries + 1):
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")

            if hist.empty or len(hist) < 2:
                print(f"Skipping {symbol}: Insufficient price data")
                return None

            prev_close = hist['Close'].iloc[-2]
            last_price = hist['Close'].iloc[-1]
            change_percent = ((last_price - prev_close) / prev_close) * 100

            return {
                "symbol": base_symbol,
                "price": last_price,
                "change_percent": round(change_percent, 2),
                "category": category
            }

        except Exception as e:
            print(f"Attempt {attempt} failed for {symbol}: {str(e)}")
            if attempt < max_retries:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                print(f"Failed to fetch {symbol} after {max_retries} attempts")
                return None


def get_top_movers_by_category(symbols, category_dict, max_workers=20):
    movers = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_symbol = {
            executor.submit(fetch_data_for_symbol, sym, category_dict): sym
            for sym in symbols
        }

        for future in as_completed(future_to_symbol):
            result = future.result()
            if result:
                movers.append(result)

    # Group by category
    category_results = {}
    for m in movers:
        cat = m["category"]
        if cat not in category_results:
            category_results[cat] = []
        category_results[cat].append(m)

    # Sort gainers/losers inside each category
    final_results = {}
    for cat, stocks in category_results.items():
        gainers = sorted(stocks, key=lambda x: x['change_percent'], reverse=True)[:5]
        losers = sorted(stocks, key=lambda x: x['change_percent'])[:5]
        final_results[cat] = {"gainers": gainers, "losers": losers}

    return final_results


if __name__ == "__main__":
    csv_file = "nifty500_marketcap_cleaned.csv"
    symbols, category_dict = read_symbols_from_csv(csv_file)
    print(f"Loaded {len(symbols)} symbols from CSV")

    try:
        start = datetime.now()
        results = get_top_movers_by_category(symbols, category_dict, max_workers=20)
        duration = datetime.now() - start

        print(f"\nLast Updated: {datetime.now()} (Duration: {duration})\n")

        for cat, data in results.items():
            print(f"\n=== {cat.upper()} ===")
            print("Top 5 Gainers:")
            for i, g in enumerate(data['gainers'], 1):
                print(f"{i:2}. {g['symbol']:15} {g['change_percent']:>7.2f}% {g['price']:.2f}")

            print("Top 5 Losers:")
            for i, l in enumerate(data['losers'], 1):
                print(f"{i:2}. {l['symbol']:15} {l['change_percent']:>7.2f}% {l['price']:.2f}")

    except KeyboardInterrupt:
        print("Process interrupted by user")
