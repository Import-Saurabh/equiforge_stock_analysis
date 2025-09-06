const express = require("express");
const router = express.Router();
const { createProxyMiddleware } = require("http-proxy-middleware");

const STOCK_API_URL = process.env.STOCK_API_URL || "http://localhost:8000";

// Optional: API key for FastAPI
const API_KEY = process.env.INTERNAL_API_SECRET || "supersecrettoken123";

// Proxy middleware to forward requests
router.use(
  "/gainers-losers",
  createProxyMiddleware({
    target: STOCK_API_URL,
    changeOrigin: true,
    pathRewrite: { "^/gainers-losers": "/mkt/movers" },
    onProxyReq: (proxyReq, req, res) => {
      // Add API key header to FastAPI request
      proxyReq.setHeader("x-api-key", API_KEY);
    },
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to fetch gainer/loser data from FastAPI",
      });
    },
  })
);

module.exports = router;
