const jwt = require("jsonwebtoken");

/**
 * Middleware to authenticate requests using JWT stored in cookies.
 * If token is valid, attaches user payload to req.user and calls next().
 */
module.exports = (req, res, next) => {
  // Skip authentication for preflight CORS requests
  if (req.method === "OPTIONS") {
    return next();
  }

  const token = req.cookies.token;

  // No token found
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Verify and decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload to request
    req.user = decoded;

    next();
  } catch (err) {
    // Token is invalid or expired
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
