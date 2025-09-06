const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

router.get("/full-load/:ticker", async (req, res) => {
  const { ticker } = req.params;

  try {
    const response = await axios.get(`http://localhost:5050/api/fallback/full-load/${ticker}`, {
      headers: {
        "x-internal-token": INTERNAL_API_SECRET,
      },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error("❌ Error calling FastAPI:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch full load data from FastAPI",
      details: error.message,
    });
  }
});

module.exports = router;
