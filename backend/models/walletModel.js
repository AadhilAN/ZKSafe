const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
    publicKey: { type: String, required: true },
    walletAddress: { type: String, required: true },
    encryptedFilePath: { type: String, required: false},
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Wallet", WalletSchema);