const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const yahooFinance = require("yahoo-finance2").default;

const csvPath = path.join(__dirname, "..", "Nifty50csv", "MW-NIFTY-50-31-Jul-2025.csv");

async function extractNifty50Tickers() {
  return new Promise((resolve, reject) => {
    const tickers = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const symbolColumn = Object.keys(row).find((col) =>
          col.toUpperCase().includes("SYMBOL")
        );
        const symbol = row[symbolColumn]?.trim().replace(/"/g, "");

        if (symbol && symbol.toUpperCase() !== "NIFTY 50") {
          tickers.push(`${symbol}.NS`);
        }
      })
      .on("end", () => resolve(tickers))
      .on("error", reject);
  });
}

async function fetchNifty50Data() {
  const tickers = await extractNifty50Tickers();
  const results = [];

  for (const ticker of tickers) {
    try {
      const info = await yahooFinance.quoteSummary(ticker, {
        modules: ["price", "summaryDetail", "defaultKeyStatistics", "assetProfile"],
      });

      results.push({
        symbol: ticker,
        name: info.price?.shortName,
        price: info.price?.regularMarketPrice,
        change_percent: info.price?.regularMarketChangePercent,
        market_cap: info.summaryDetail?.marketCap,
        pe_ratio: info.summaryDetail?.trailingPE,
        sector: info.assetProfile?.sector,
      });
    } catch (err) {
      console.error(`Error fetching ${ticker}:`, err.message);
    }
  }

  return results;
}

module.exports = { fetchNifty50Data };
