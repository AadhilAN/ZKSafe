const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    publicKey: { type: String, required: true },
    encryptedFilePath: { type: String, required: true},
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Wallet", WalletSchema);