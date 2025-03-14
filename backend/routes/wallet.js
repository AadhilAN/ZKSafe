const express = require('express');
const { getWalletBalance, sendEther, getWalletAddress } = require('../controllers/walletController');
const { authenticate } = require('../middlewares/authMiddleware');
const router = express.Router();

// Route to get wallet balance
router.get('/details', authenticate, getWalletAddress);

// Route to get wallet balance
router.get('/balance', authenticate, getWalletBalance);

// Route to send Ether
router.post('/send', authenticate, sendEther);

module.exports = router;