const { getBalance, transferEther } = require('../Services/walletService');
const { isAddress } = require('ethers');
const Wallet = require('../models/walletModel');
const User = require('../models/userModel');

// Get Wallet Address
exports.getWalletAddress = async (req, res) => {
    console.log("Get Wallet Address");
    try {
        // First get the user with the wallet reference
        const user = await User.findById(req.user._id);
        
        if (!user || !user.walletID) {
            return res.status(404).json({ message: 'User has no associated wallet' });
        }
        
        // Then find the wallet using the walletID from the user
        const wallet = await Wallet.findById(user.walletID);
        
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        
        const walletAddress = wallet.walletAddress;
        console.log("Wallet Address: ", walletAddress);
        
        res.status(200).json({ walletAddress });
    } catch (error) {
        console.error("Error in getWalletAddress:", error);
        res.status(500).json({ message: error.message });
    }
};


// Get Balance
exports.getWalletBalance = async (req, res) => {
    try {
        console.log("Getting Wallet Balance");
        const wallet = await Wallet.findById(req.user.walletID);
        const { publicKey, balance } = await getBalance(wallet.walletAddress);
        //console.log("Wallet Balance controller: ", balance.toString());

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