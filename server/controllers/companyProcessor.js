// /controllers/companyProcessor.js
const yahooFinance = require("yahoo-finance2").default;

const { insertCompany } = require("../services/companyService");
const { fetchAndSaveFinancialRatios } = require("../services/ratioService");
const { getMoneycontrolCashflow } = require("../services/cashflowService");
const { saveNsePriceHistory } = require("../services/saveNseHistory");
const { saveBsePriceHistory } = require("../services/saveBseHistory");
const { insertFinancialItems } = require("../services/financialStatementsService");

async function processCompany(companyName) {
  const tickerNS = `${companyName}.NS`;
  const tickerBO = `${companyName}.BO`;

  let tickerInfo;

  // Try NSE first
  try {
    tickerInfo = await yahooFinance.quoteSummary(tickerNS, {
      modules: ["price", "summaryDetail", "assetProfile"],
    });
    tickerInfo.symbol = tickerNS;
  } catch {
    // Try BSE as fallback
    try {
      tickerInfo = await yahooFinance.quoteSummary(tickerBO, {
        modules: ["price", "summaryDetail", "assetProfile"],
      });
      tickerInfo.symbol = tickerBO;
    } catch {
      console.error("❌ Could not resolve company on NSE or BSE");
      return false;
    }
  }

  try {
    const companyId = await insertCompany(tickerInfo);
    console.log(`✅ Inserted company: ${tickerInfo.price.shortName} (ID: ${companyId})`);

    // ✅ Financial Ratios from Moneycontrol
    await fetchAndSaveFinancialRatios(tickerInfo.symbol, companyId);
    console.log("✅ Financial ratios saved");

    // ✅ Cash Flow from Moneycontrol
    await getMoneycontrolCashflow(tickerInfo.symbol, companyId);
    console.log("✅ Cash flow data saved");

    // ✅ YFinance: Balance Sheet, Income Statement, Cash Flow Items
    await insertFinancialItems(tickerInfo.symbol, companyId, "balance-sheet");
    await insertFinancialItems(tickerInfo.symbol, companyId, "income-statement");
    await insertFinancialItems(tickerInfo.symbol, companyId, "cash-flow");
    console.log("✅ Financial statements saved");

    // ✅ NSE/BSE Price History
    if (tickerInfo.symbol.includes(".NS")) {
      await saveNsePriceHistory(tickerInfo.symbol, companyId);
      console.log("✅ NSE price history saved");
    } else if (tickerInfo.symbol.includes(".BO")) {
      await saveBsePriceHistory(tickerInfo.symbol, companyId);
      console.log("✅ BSE price history saved");
    }

    return true;
  } catch (err) {
    console.error("❌ Failed to process company:", err.message);
    return false;
  }
}

module.exports = { processCompany };
