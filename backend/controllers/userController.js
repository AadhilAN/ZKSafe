const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const { generateToken } = require('../Services/userService');

// Register User
exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Generate Ethereum Wallet
        const wallet = ethers.Wallet.createRandom();
        const publicKey = wallet.address;
        const privateKey = wallet.privateKey;

        // Log the private key for testing purposes
        console.log(`Private Key for user ${email}: ${privateKey}`);

        // Create a new user
        const user = new User({ name, email, password, ethereumAddress: publicKey });
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        // Return user token and Ethereum address
        res.status(201).json({ token, ethereumAddress: publicKey });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login User
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = generateToken(user._id);
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};