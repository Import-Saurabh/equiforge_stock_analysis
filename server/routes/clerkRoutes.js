const express = require('express');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const { saveClerkUser } = require('../controllers/clerkController');
const router = express.Router();

// Add this debug route first to test connectivity
router.get('/debug', (req, res) => {
  console.log('✅ Debug route hit');
  res.json({ status: 'working', timestamp: new Date() });
});

router.post('/save-user', 
  ClerkExpressWithAuth({
    authorizedParties: ['http://localhost:5173'],
    secretKey: process.env.CLERK_SECRET_KEY  // Use secretKey instead of jwtKey
  }), 
  saveClerkUser
);
module.exports = router;


