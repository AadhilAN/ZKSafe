const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    password2: { type: String, required: true },
    ethereumAddress: { type: String, required: true },
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