const express = require("express");
const router = express.Router();
const { register, login, logout } = require("../controllers/authController");

const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

// Rate limiter for login
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again in 10 minutes.",
});

// Input validation
const validateRegister = [
  body("username").isLength({ min: 3 }),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
];

const validateLogin = [
  body("email").isEmail(),
  body("password").notEmpty(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/login", loginLimiter, validateLogin, handleValidationErrors, login);
router.post("/logout", logout);

module.exports = router;
