// /services/ratioService.js
const axios = require("axios");
const cheerio = require("cheerio");
const db = require("../../config/db");

async function getMoneycontrolURL(companyName) {
  try {
    const { data } = await axios.get("https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php", {
      params: {
        classic: "true",
        query: companyName,
        type: "1",
        format: "json",
      },
    });

    if (!data || !data.length) return null;

    const slug = data[0].link_src.split("/").slice(-2, -1)[0].toLowerCase();
    const sc_id = data[0].sc_id;

    return `https://www.moneycontrol.com/financials/${slug}/ratiosVI/${sc_id}#${sc_id}`;
  } catch (err) {
    console.warn("❌ MoneyControl URL fetch error:", err.message);
    return null;
  }
}

function parseRatios($) {
  const rows = $("table.mctable1 tr");
  if (rows.length < 2) return null;

  const yearHeaders = $(rows[0]).find("td").slice(1, -1);
  const years = [];

  yearHeaders.each((_, cell) => {
    const text = $(cell).text();
    const match = text.match(/\d{2}/);
    if (match) {
      const suffix = parseInt(match[0]);
      const year = suffix < 50 ? 2000 + suffix : 1900 + suffix;
      years.push(`${year}-03-31`);
    }
  });

  const dataByYear = Object.fromEntries(years.map((y) => [y, {}]));

  const ratioMapping = {
    "Return On Equity / Networth (%)": "roe",
    "Return On Capital Employed (%)": "roce",
    "Debt-Equity Ratio": "debt_to_equity", // ✅ Match DB column
  };

  rows.slice(2).each((_, row) => {
    const cells = $(row).find("td");
    const label = $(cells[0]).text().trim();
    const key = ratioMapping[label];
    if (!key) return;

    cells.slice(1, years.length + 1).each((i, cell) => {
      const text = $(cell).text().trim().replace(/,/g, "") || "0";
      const val = parseFloat(text.replace(/[^\d.-]/g, ""));
      if (!isNaN(val)) {
        dataByYear[years[i]][key] = val;
      }
    });
  });

  return dataByYear;
}

async function fetchAndSaveFinancialRatios(ticker, companyId) {
  const companyName = ticker.replace(".NS", "");
  const url = await getMoneycontrolURL(companyName);
  if (!url) return false;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const $ = cheerio.load(html);
    const dataByYear = parseRatios($);
    if (!dataByYear) return false;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      for (const [date, row] of Object.entries(dataByYear)) {
        const {
          roe = 0,
          roce = 0,
          debt_to_equity = 0,
        } = row;

        await conn.execute(
          `INSERT INTO financial_ratios 
            (company_id, fiscal_date, roe, roce, debt_to_equity)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             roe = VALUES(roe),
             roce = VALUES(roce),
             debt_to_equity = VALUES(debt_to_equity)`,
          [companyId, date, roe, roce, debt_to_equity]
        );
      }

      await conn.commit();
      return true;
    } catch (dbErr) {
      console.error("❌ DB insert failed:", dbErr.message);
      await conn.rollback();
      return false;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("❌ Scraping ratios failed:", err.message);
    return false;
  }
}

module.exports = { fetchAndSaveFinancialRatios };
