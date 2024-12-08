const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const { generateToken } = require('../Services/userService');
const { encryptContent } = require('../utils/encryption');

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
        // console.log(`Private Key for user ${email}: ${privateKey}`);
        
        // console.log(`Private key saved to file: ${filePath}`);
        
        // Create a new user
        const user = new User({ name, email, password, ethereumAddress: publicKey });
        await user.save();
        
        const hashedPassword = user.password; // The hashed password from the pre save model
        // Write private key to a .txt file named by the user's email
        const fileContent = `Your Ethereum Wallet Details:\n\nPublic Address: ${publicKey}\nPrivate Key: ${privateKey}\n\nKeep this file secure and do not share it with anyone!`;
        const { iv, encryptedData } = encryptContent(fileContent, hashedPassword);
        
        const fileName = `${email}.txt`;
        const filePath = path.join(__dirname, '../keys', fileName);
        const encryptedFileContent = `IV: ${iv}\nEncrypted Data: ${encryptedData}`

        // Ensure the "keys" directory exists before writing the file
        if (!fs.existsSync(path.join(__dirname, '../keys'))) {
            fs.mkdirSync(path.join(__dirname, '../keys'));
        }

        fs.writeFileSync(filePath, encryptedFileContent);
        console.log(`Encrypted private key saved to file: ${filePath}`);

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