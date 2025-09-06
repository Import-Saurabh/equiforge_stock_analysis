"""
pyservice/financial_api.py

Provides a single function `get_financials(ticker: str) -> dict` which
returns a dict:
{
  "ticker": "<TICKER>",
  "quarterly": [ { period, revenue, profit, netWorth }, ... ],
  "yearly":    [ { period, revenue, profit, netWorth }, ... ]
}

Values are converted to Indian Rupees Crores (Rs. Cr) by dividing raw yfinance
numbers by 1e7 and rounding to 2 decimals.

This module is intentionally defensive because yfinance DataFrame row names vary
between tickers and markets.
"""
from typing import Dict, List, Any
import yfinance as yf
import pandas as pd
from logger import get_logger

logger = get_logger("FinancialAPI")

# candidate names for common rows in financials / balance sheet
REVENUE_CANDIDATES = [
    "total revenue", "revenue", "net sales", "sales", "total net revenue", "operating revenue"
]
PROFIT_CANDIDATES = [
    "net income", "netincome", "net profit", "profit", "net income applicable to common shares"
]
ASSETS_CANDIDATES = [
    "total assets", "assets"
]
LIAB_CANDIDATES = [
    "total liab", "total liabilities", "liabilities", "total liabs"
]

def _normalize_ticker(ticker: str) -> str:
    """If ticker has no exchange suffix, assume NSE (.NS)."""
    if "." in ticker:
        return ticker
    return f"{ticker}.NS"

def _col_to_period_label(col: Any) -> str:
    """Format column label to a friendly period string."""
    try:
        if hasattr(col, "strftime"):
            # Quarterly: "Jun '24"
            # Yearly: prefer full year if timestamp is year-end
            return col.strftime("%b '%y")
        # if string like '2021-12-31'
        s = str(col)
        if len(s) >= 4 and s[:4].isdigit():
            # prefer '2021' if looks like yearly; otherwise keep full string
            try:
                dt = pd.to_datetime(s)
                # if month == 12 and day == 31 treat as year
                if dt.month == 12 and dt.day == 31:
                    return dt.strftime("%Y")
                return dt.strftime("%b '%y")
            except Exception:
                return s
        return s
    except Exception:
        return str(col)

def _find_series_value(df: pd.DataFrame, col: Any, candidates: List[str]) -> float:
    """
    Try to find a row in df.index where the row name matches any candidate (case-insensitive).
    Returns numeric value for given column or 0.
    """
    if df is None or df.empty:
        return 0.0

    # prepare lower-index lookup
    try:
        idx_list = [str(i).lower() for i in df.index]
    except Exception:
        idx_list = []

    for cand in candidates:
        cand_low = cand.lower()
        for idx, name in enumerate(idx_list):
            if cand_low in name:
                try:
                    label = df.index[idx]
                    val = df.loc[label, col]
                    return float(val if pd.notna(val) else 0.0)
                except Exception:
                    continue
    # fallback: try exact candidate keys (case-sensitive)
    for cand in candidates:
        if cand in df.index:
            try:
                val = df.loc[cand, col]
                return float(val if pd.notna(val) else 0.0)
            except Exception:
                continue
    return 0.0

def _df_to_list(fin_df: pd.DataFrame, bs_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Convert a yfinance financial DataFrame into list of dicts:
    [{ period, revenue, profit, netWorth }, ...]
    Returns chronological order: oldest -> newest
    """
    out = []
    if fin_df is None or fin_df.empty:
        return out

    # iterate columns (each column is a period)
    for col in fin_df.columns:
        period_label = _col_to_period_label(col)

        # revenue / profit heuristics
        revenue = _find_series_value(fin_df, col, REVENUE_CANDIDATES)
        profit = _find_series_value(fin_df, col, PROFIT_CANDIDATES)

        # net worth = total assets - total liabilities (best-effort)
        assets = _find_series_value(bs_df, col, ASSETS_CANDIDATES) if bs_df is not None else 0.0
        liab = _find_series_value(bs_df, col, LIAB_CANDIDATES) if bs_df is not None else 0.0
        networth = (assets - liab)

        # convert to Rs Crore (divide by 1e7) and round
        def to_cr(x):
            try:
                return round(float(x or 0.0) / 1e7, 2)
            except Exception:
                return 0.0

        out.append({
            "period": period_label,
            "revenue": to_cr(revenue),
            "profit": to_cr(profit),
            "netWorth": to_cr(networth)
        })

    # yfinance returns columns newest->oldest sometimes; ensure chronological oldest->newest
    try:
        return list(reversed(out))
    except Exception:
        return out

def get_financials(ticker: str) -> Dict[str, Any]:
    """
    Fetch quarterly & yearly financials using yfinance and return:
    { "ticker": ticker, "quarterly": [...], "yearly": [...] }

    NOTE: keep this function pure (no caching). Cache at the endpoint level (ExplorePage_Api).
    """
    try:
        yf_ticker = _normalize_ticker(ticker)
        t = yf.Ticker(yf_ticker)

        # Income statements
        q_is = t.quarterly_financials       # pandas DataFrame (columns are periods)
        y_is = t.financials                 # yearly

        # Balance sheets
        q_bs = t.quarterly_balance_sheet
        y_bs = t.balance_sheet

        quarterly = _df_to_list(q_is, q_bs)
        yearly = _df_to_list(y_is, y_bs)

        return {"ticker": ticker, "quarterly": quarterly, "yearly": yearly}
    except Exception as e:
        logger.error(f"get_financials() failed for {ticker}: {e}")
        raise
