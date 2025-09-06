// /services/insertPrice.js
const db = require("../../config/db");

/**
 * Insert or update historical price data into the database
 * @param {Array<Object>} priceDataList - List of price data objects:
 * [
 *   { company_id, exchange, date, open, close, high, low, volume },
 *   ...
 * ]
 */
async function insertPriceHistory(priceDataList) {
  if (!Array.isArray(priceDataList) || priceDataList.length === 0) return;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const query = `
      INSERT INTO price_history 
        (company_id, exchange, date, open, close, high, low, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        open = VALUES(open),
        close = VALUES(close),
        high = VALUES(high),
        low = VALUES(low),
        volume = VALUES(volume)
    `;

    for (const row of priceDataList) {
      const {
        company_id,
        exchange,
        date,
        open = 0,
        close = 0,
        high = 0,
        low = 0,
        volume = 0,
      } = row;

      await conn.execute(query, [
        company_id,
        exchange,
        date,
        open,
        close,
        high,
        low,
        volume,
      ]);
    }

    await conn.commit();
    console.log(`✅ Inserted ${priceDataList.length} price records.`);
  } catch (err) {
    await conn.rollback();
    console.error("❌ Failed to insert price history:", err.message);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { insertPriceHistory };
