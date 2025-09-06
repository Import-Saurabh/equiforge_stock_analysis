# balance_sheet_service.py
import yfinance as yf
import pandas as pd
from logger import get_logger

logger = get_logger("services.balance_sheet")

def get_balance_sheet_data(ticker_symbol):
    """
    Fetch complete balance sheet data from yfinance without database insertion
    Returns: Dictionary with years and data for display
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        balance_sheet = ticker.balance_sheet
        
        if balance_sheet.empty:
            logger.warning(f"⚠️ Balance sheet data empty for {ticker_symbol}")
            return None
        
        # Transpose to have dates as rows and convert to dictionary
        balance_sheet = balance_sheet.T
        
        # Extract years from columns (dates)
        years = [str(col.year) for col in balance_sheet.index]
        
        # Prepare data for frontend - get ALL available items
        data = []
        
        # Get all available balance sheet items
        all_items = balance_sheet.columns.tolist()
        
        # Common balance sheet categories in logical order
        categories = {
            "Assets": [
                "Total Assets",
                "Current Assets",
                "Cash And Cash Equivalents",
                "Short Term Investments",
                "Net Receivables",
                "Inventory",
                "Other Current Assets",
                "Non Current Assets",
                "Property Plant Equipment",
                "Goodwill",
                "Intangible Assets",
                "Long Term Investments",
                "Other Non Current Assets"
            ],
            "Liabilities": [
                "Total Liabilities",
                "Current Liabilities",
                "Accounts Payable",
                "Short Long Term Debt",
                "Other Current Liabilities",
                "Non Current Liabilities",
                "Long Term Debt",
                "Other Non Current Liabilities"
            ],
            "Equity": [
                "Total Stockholder Equity",
                "Common Stock",
                "Retained Earnings",
                "Other Stockholder Equity",
                "Preferred Stock",
                "Treasury Stock"
            ]
        }
        
        # First add categorized items in order
        for category, items in categories.items():
            # Add category header
            data.append({
                "item": category,
                "values": ["—"] * len(years),
                "isCategory": True
            })
            
            for item in items:
                if item in all_items:
                    values = []
                    for year in years:
                        # Find the corresponding value for this year
                        year_idx = years.index(year)
                        value = balance_sheet.iloc[year_idx][item]
                        if pd.isna(value):
                            values.append("—")
                        else:
                            # Format large numbers in Cr.
                            values.append(f"₹{value/1e7:,.0f}" if abs(value) >= 1e7 else f"₹{value:,.0f}")
                    data.append({
                        "item": item,
                        "values": values,
                        "isCategory": False
                    })
        
        # Then add any remaining items that weren't in our categories
        uncategorized_items = [item for item in all_items if not any(item in cat_items for cat_items in categories.values())]
        
        if uncategorized_items:
            data.append({
                "item": "Other Items",
                "values": ["—"] * len(years),
                "isCategory": True
            })
            
            for item in uncategorized_items:
                values = []
                for year in years:
                    year_idx = years.index(year)
                    value = balance_sheet.iloc[year_idx][item]
                    if pd.isna(value):
                        values.append("—")
                    else:
                        values.append(f"₹{value/1e7:,.0f}" if abs(value) >= 1e7 else f"₹{value:,.0f}")
                data.append({
                    "item": item,
                    "values": values,
                    "isCategory": False
                })
        
        return {
            "years": years,
            "data": data
        }
        
    except Exception as e:
        logger.error(f"❌ Error in get_balance_sheet_data({ticker_symbol}): {str(e)}", exc_info=True)
        return None