const { getBalance, transferEther } = require('../Services/walletService');
const { isAddress } = require('ethers');
// Get Balance
exports.getWalletBalance = async (req, res) => {
    console.log("walletController.js");
    const { address } = req.query;

    try {
        if (!isAddress(address)) {
            return res.status(400).json({ message: 'Invalid Ethereum address' });
        }

        const balance = await getBalance(address);
        res.status(200).json({ address, balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Transfer Ether
exports.sendEther = async (req, res) => {
    const { privateKey, to, amount } = req.body;

    try {
        if (!isAddress(to)) {
            return res.status(400).json({ message: 'Invalid recipient address' });
        }

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid transfer amount' });
        }

        const txResponse = await transferEther(privateKey, to, amount);
        res.status(200).json({
            message: 'Transaction successful',
            transactionHash: txResponse.hash,
            blockNumber: txResponse.blockNumber,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};