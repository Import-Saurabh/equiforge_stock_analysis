const express = require('express');
const router = express.Router();
const { fetchFinancialRatios } = require('../services/apifyService');

router.get('/fundamentals/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();

    const data = await fetchFinancialRatios(symbol);

    if (!data) return res.status(500).json({ error: 'Failed to fetch financial ratios' });

    res.json(data);
});

module.exports = router;
