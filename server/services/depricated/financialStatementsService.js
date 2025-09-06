// /services/financialStatementsService.js
const yahooFinance = require("yahoo-finance2").default;
const db = require("../../config/db");

/**
 * Insert structured financial statement data into MySQL.
 * @param {string} ticker - Ex: "TCS.NS"
 * @param {number} companyId
 * @param {string} type - "balance-sheet" | "income-statement" | "cash-flow"
 */
async function insertFinancialItems(ticker, companyId, type) {
  let moduleName, table;

  if (type === "balance-sheet") {
    moduleName = "balanceSheetHistory";
    table = "balance_sheet_items";
  } else if (type === "income-statement") {
    moduleName = "incomeStatementHistory";
    table = "income_statement_items";
  } else if (type === "cash-flow") {
    moduleName = "cashflowStatementHistory";
    table = "cash_flow_items";
  } else {
    console.error(`❌ Unknown statement type: ${type}`);
    return false;
  }

  try {
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: [moduleName],
    });

    const records = result[moduleName]?.financials || result[moduleName];
    if (!Array.isArray(records) || records.length === 0) {
      console.warn(`⚠️ No data for ${type} in ${ticker}`);
      return false;
    }

    const conn = await db.getConnection();
    let insertCount = 0;

    try {
      await conn.beginTransaction();

      for (const item of records) {
        const fiscalDate = new Date(item.endDate).toISOString().split("T")[0];

        for (const [field, value] of Object.entries(item)) {
          if (field === "maxAge" || field === "endDate") continue;
          const numericValue =
            typeof value === "object" && value !== null ? value.raw : value;

          if (numericValue == null || isNaN(numericValue)) continue;

          await conn.execute(
            `INSERT INTO ${table} 
              (company_id, fiscal_date, item_name, item_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE item_value = VALUES(item_value)`,
            [companyId, fiscalDate, field, numericValue]
          );

          insertCount++;
        }
      }

      await conn.commit();
      console.log(`✅ Inserted ${insertCount} items into ${table} for ${ticker}`);
      return true;
    } catch (dbErr) {
      console.error("❌ DB insert error:", dbErr.message);
      await conn.rollback();
      return false;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(`❌ Failed to fetch ${type} data for ${ticker}:`, err.message);
    return false;
  }
}

module.exports = { insertFinancialItems };
