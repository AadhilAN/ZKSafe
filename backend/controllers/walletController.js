const { getBalance, transferEther } = require('../Services/walletService');
const { isAddress } = require('ethers');

// Get Balance
exports.getWalletBalance = async (req, res) => {
    
    try {
        const email = req.user.email;
        const { publicKey, balance } = await getBalance(email);

        res.status(200).json({ publicKey, balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Transfer Ether
exports.sendEther = async (req, res) => {
    const {to, amount } = req.body;

    try {
        const email = req.user.email; // Logged-in user's email
        const receipt = await transferEther(email, to, amount);

        res.status(200).json({
            message: 'Transaction successful',
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};