// /services/saveBseHistory.js
const yahooFinance = require("yahoo-finance2").default;
const { insertPriceHistory } = require("./insertPrice");

async function saveBsePriceHistory(ticker, companyId) {
  try {
    const chartData = await yahooFinance.chart(ticker, {
      range: "5y",
      interval: "1d",
    });

    if (!chartData?.timestamp?.length || !chartData.indicators?.quote?.[0]) {
      throw new Error("No valid price data returned");
    }

    const { timestamp } = chartData;
    const { open, close, high, low, volume } = chartData.indicators.quote[0];

    const priceDataList = timestamp.map((ts, i) => ({
      company_id: companyId,
      exchange: "BSE",
      date: new Date(ts * 1000).toISOString().split("T")[0],
      open: open[i] ?? 0,
      close: close[i] ?? 0,
      high: high[i] ?? 0,
      low: low[i] ?? 0,
      volume: volume[i] ?? 0,
    }));

    await insertPriceHistory(priceDataList);
    return true;
  } catch (err) {
    console.error(`❌ Failed to fetch BSE history for ${ticker}:`, err.message);
    return false;
  }
}

module.exports = { saveBsePriceHistory };
