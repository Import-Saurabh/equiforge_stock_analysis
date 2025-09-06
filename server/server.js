const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();
const { ClerkExpressWithAuth } = require("@clerk/clerk-sdk-node");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8000",
  "https://your-production.com"
];

// ✅ Enhanced CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, x-api-key");
    res.setHeader("Access-Control-Expose-Headers", "*");
  }
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(express.json());
app.use(cookieParser());

// Verify required environment variables
const requiredEnvVars = ['CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
});

// ==================== Stock Market Data Proxy ====================
// Proxy configuration for FastAPI stock service
const stockApiProxy = createProxyMiddleware({
  target: process.env.STOCK_API_URL || 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {'^/api/stock': ''},
  onError: (err, req, res) => {
    console.error('Stock API proxy error:', err);
    res.status(502).json({ 
      error: 'Bad Gateway',
      message: 'Stock data service is currently unavailable'
    });
  }
});

// Stock market data routes
app.use('/api/stock', stockApiProxy);

// ================ Fundamentals route (yahoo-finance2) ====================

// ==================== Fundamentals route (FastAPI proxy only) ====================

const axios = require("axios");

/**
 * GET /api/fundamentals/:ticker
 * Example: /api/fundamentals/RELIANCE.NS
 */
app.get("/api/fundamentals/:ticker", async (req, res) => {
  let { ticker } = req.params;

  // Normalize ticker
  ticker = ticker.trim().toUpperCase();
  if (ticker.endsWith(".NS.NS")) ticker = ticker.replace(".NS.NS", ".NS");
  if (!ticker.endsWith(".NS") && !ticker.endsWith(".BO")) ticker += ".NS";

  try {
    console.log(`🔄 Forwarding fundamentals request for ${ticker} → FastAPI`);

    const fastApiUrl = `${process.env.STOCK_API_URL || "http://localhost:8000"}/api/fallback/full-load/${ticker}`;
    const response = await axios.get(fastApiUrl, {
      headers: {
        "x-internal-token": process.env.INTERNAL_API_SECRET || "supersecrettoken123",
      },
      timeout: 30000, // 30s timeout to avoid hanging
    });

    if (!response.data || response.data.success === false) {
      console.warn(`⚠️ Fundamentals not found for ${ticker}`);
      return res.status(404).json({
        error: "No fundamentals found",
        details: response.data?.error || "Unknown error",
      });
    }

    console.log(`✅ Fundamentals received from FastAPI for ${ticker}`);
    return res.json(response.data);

  } catch (err) {
    console.error(`💥 Fundamentals fetch failed for ${ticker}:`, err.message);
    return res.status(500).json({
      error: "Failed to fetch fundamentals",
      message: err.message,
    });
  }
});

// ==================== Existing Routes ====================
// Authentication routes
const authRoutes = require("./routes/Auth");
app.use("/api/auth", authRoutes);

// Clerk routes
const clerkRoutes = require("./routes/clerkRoutes");
app.use("/api/clerk", clerkRoutes);

// Data routes
const fullLoadRoute = require("./routes/fullLoadRoute");
app.use("/api/data", fullLoadRoute);

// ==================== Health Check ====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "active",
    timestamp: new Date(),
    services: {
      database: "connected",
      stock_api: process.env.STOCK_API_URL ? "configured" : "using default"
    }
  });
});

// ==================== Error Handling ====================
app.use((err, req, res, next) => {
  console.error("💥 SERVER ERROR:", err.stack);
  
  // Special handling for CORS errors
  if (err.name === 'CorsError') {
    return res.status(403).json({ 
      error: "CORS Blocked",
      message: `Origin '${req.headers.origin}' not allowed`,
      allowedOrigins
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Please contact support',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔐 Clerk Keys: ${process.env.CLERK_PUBLISHABLE_KEY ? 'Loaded' : 'Missing'}`);
  console.log(`📈 Stock API: ${process.env.STOCK_API_URL || 'http://localhost:8000'}`);
});// working