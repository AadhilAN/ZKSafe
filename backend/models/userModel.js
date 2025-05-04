const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    password2: { type: String, required: true },
    usernameHash: { type: String, required: true },
    saltCommitment: { type: String, required: true },
    identityCommitment: { type: String, required: true },   
    deviceCommitment: { type: String, required: true },
    lastAuthTimestamp: { type: Date, required: true },
    walletID: { type: mongoose.Schema.Types.ObjectId,ref: "Wallet", required: true },
    ipfsSharesID: [{ type: mongoose.Schema.Types.ObjectId, ref: "IPFSShare" }],
    currentChallenge: {
        challengeValue: { type: String, required: false },
        expectedChallengeResponse: { type: String, required: false },
        timestamp: { type: Date, required: false },
        expires: { type: Date, required: false }
      },
    createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified("password") && !this.isModified("password2")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.password2 = await bcrypt.hash(this.password2, salt);
    next();
});

module.exports = mongoose.model('User', UserSchema)