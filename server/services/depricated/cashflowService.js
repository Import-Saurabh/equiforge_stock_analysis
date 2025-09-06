const axios = require("axios");
const cheerio = require("cheerio");
const db = require("../../config/db");

/**
 * Get the Moneycontrol Cash Flow URL via autosuggestion
 */
async function getMoneycontrolUrl(companyName) {
  try {
    const response = await axios.get(
      "https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php",
      {
        params: {
          classic: "true",
          query: companyName,
          type: "1",
          format: "json",
        },
      }
    );

    const result = response.data?.[0];
    if (!result) return null;

    const slug = result.link_src.split("/").slice(-2, -1)[0].toLowerCase();
    const sc_id = result.sc_id;

    return `https://www.moneycontrol.com/financials/${slug}/cash-flowVI/${sc_id}#${sc_id}`;
  } catch (err) {
    console.warn("❌ Moneycontrol URL fetch failed:", err.message);
    return null;
  }
}

/**
 * Parse cash flow table into structured yearly data
 */
function parseCashflowTable($) {
  const table = $("table.mctable1");
  if (!table.length) {
    console.warn("❌ Cash flow table not found");
    return null;
  }

  const rows = table.find("tr");
  if (rows.length < 3) {
    console.warn("❌ Unexpected table structure");
    return null;
  }

  const headerCells = $(rows[0]).find("td").slice(1, -1); // Skip first and last
  const years = [];

  headerCells.each((_, cell) => {
    const text = $(cell).text();
    const match = text.match(/\d{2}/);
    if (match) {
      const suffix = parseInt(match[0]);
      const fullYear = suffix < 50 ? 2000 + suffix : 1900 + suffix;
      years.push(`${fullYear}-03-31`);
    }
  });

  const dataByYear = Object.fromEntries(years.map((y) => [y, {}]));

  const ratioMapping = {
    "Net CashFlow From Operating Activities": "operating_cashflow",
    "Net Cash Used In Investing Activities": "capex",
  };

  rows.slice(2).each((_, row) => {
    const cells = $(row).find("td");
    const label = $(cells[0]).text().trim();
    const key = ratioMapping[label];

    if (!key) return;

    cells.slice(1, years.length + 1).each((i, cell) => {
      const rawText = $(cell).text().trim().replace(/,/g, "") || "0";
      const val = parseFloat(rawText.replace(/[^\d.-]/g, ""));
      if (!isNaN(val)) {
        dataByYear[years[i]][key] = val;
      }
    });
  });

  // Compute Free Cash Flow
  const finalData = {};
  for (const [year, vals] of Object.entries(dataByYear)) {
    if ("operating_cashflow" in vals && "capex" in vals) {
      vals.free_cash_flow = vals.operating_cashflow - vals.capex;
      finalData[year] = vals;
    }
  }

  return finalData;
}

/**
 * Fetch, parse, and insert cash flow data for a company
 * @param {string} ticker - E.g., "TCS.NS"
 * @param {number} companyId
 */
async function getMoneycontrolCashflow(ticker, companyId) {
  const companyName = ticker.replace(".NS", "").replace(".BO", "");
  const url = await getMoneycontrolUrl(companyName);
  if (!url) {
    console.error("❌ Could not resolve Moneycontrol URL");
    return false;
  }

  try {
    console.log("📄 Scraping:", url);

    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const $ = cheerio.load(res.data);
    const dataByYear = parseCashflowTable($);
    if (!dataByYear) return false;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      for (const [date, data] of Object.entries(dataByYear)) {
        const ocf = data.operating_cashflow || 0;
        const capex = data.capex || 0;
        const fcf = data.free_cash_flow || 0;

        await conn.execute(
          `INSERT INTO financial_ratios 
           (company_id, fiscal_date, operating_cashflow, capex, free_cash_flow)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             operating_cashflow = VALUES(operating_cashflow),
             capex = VALUES(capex),
             free_cash_flow = VALUES(free_cash_flow)`,
          [companyId, date, ocf, capex, fcf]
        );
      }

      await conn.commit();
      console.log("✅ Cash flow data inserted from Moneycontrol");
      return true;
    } catch (err) {
      console.error("❌ DB insert failed:", err.message);
      await conn.rollback();
      return false;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("❌ Error during scraping:", err.message);
    return false;
  }
}

module.exports = { getMoneycontrolCashflow };
