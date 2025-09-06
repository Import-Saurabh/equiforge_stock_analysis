// /services/companyService.js
const db = require("../../config/db");

async function insertCompany(tickerInfo) {
  const longName = tickerInfo.longName || "N/A";
  const symbol = tickerInfo.symbol || "N/A";
  const exchange = tickerInfo.exchange || "N/A";

  const nse_code = symbol.includes(".NS") ? symbol : null;
  const bse_code = symbol.includes(".BO") ? symbol : null;

  try {
    const [rows] = await db.execute(
      `SELECT id FROM companies WHERE nse_code = ? OR bse_code = ?`,
      [nse_code, bse_code]
    );

    if (rows.length > 0) {
      return rows[0].id;
    }

    const query = `
      INSERT INTO companies 
        (name, ticker, nse_code, bse_code, exchange, country, sector, industry, 
         market_cap, website, full_time_employees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      longName,
      symbol,
      nse_code,
      bse_code,
      exchange,
      tickerInfo.country || "N/A",
      tickerInfo.sector || "N/A",
      tickerInfo.industry || "N/A",
      tickerInfo.marketCap || 0,
      tickerInfo.website || "N/A",
      tickerInfo.fullTimeEmployees || 0,
    ];

    const [result] = await db.execute(query, values);
    return result.insertId;

  } catch (err) {
    console.error("❌ Error inserting company:", err.message);
    throw err;
  }
}

module.exports = { insertCompany };
