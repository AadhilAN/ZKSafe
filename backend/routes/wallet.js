const express = require('express');
const { getWalletBalance, sendEther } = require('../controllers/walletController');
const router = express.Router();

// Route to get wallet balance
router.get('/balance', getWalletBalance);

// Route to send Ether
router.post('/send', sendEther);

module.exports = router;