const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');
const { generateToken } = require('../Services/userService');
const { encryptContent } = require('../utils/encryption');

// Register User
exports.register = async (req, res) => {
    const { name, email, password, password2 } = req.body;

    if (!name || !email || !password || !password2) {
        return res.status(400).json({ message: "All fields are required" });
    }
    if (password === password2) {
        return res.status(400).json({ message: "Password and Password2 should not be the same" });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Generate Ethereum Wallet
        const wallet = ethers.Wallet.createRandom();
        const walletAddress = wallet.address;
        const privateKey = wallet.privateKey;

        console.log("Private Key: ", privateKey);
        console.log("public Key: ", walletAddress);
        
        // Create a new user
        const user = new User({ name, email, password, password2, ethereumAddress: walletAddress });
        await user.save();
        
        const hashedPassword = user.password; // The hashed password from the pre-save model
        const hashedPassword2 = user.password2; // The hashed password2 from the pre-save model

        // Write private key to a .txt file named by the user's email
        const fileContent = `Your Ethereum Wallet Details:\n\nPublic Address: ${walletAddress}\nPrivate Key: ${privateKey}\n\nKeep this file secure and do not share it with anyone!`;
        const { iv: txtIv, encryptedData: txtEncryptedData } = encryptContent(fileContent, hashedPassword);

        const filePath = path.join(__dirname, '../keys', `${email}.txt`);
        const encryptedFileContent = `IV: ${txtIv}\nEncrypted Data: ${txtEncryptedData}`;

        // Ensure the "keys" directory exists before writing the file
        if (!fs.existsSync(path.join(__dirname, '../keys'))) {
            fs.mkdirSync(path.join(__dirname, '../keys'));
        }

        fs.writeFileSync(filePath, encryptedFileContent);
        console.log(`Encrypted private key saved to file: ${filePath}`);

        // Create and encrypt the input.json file
        const inputContent = {
            privateKey,
            walletAddress
        };
        const inputPath = path.join(__dirname, '../inputs', `${email}_input.json`);
        const inputJson = JSON.stringify(inputContent, null, 2);

        // const { iv: inputIv, encryptedData: inputEncryptedData } = encryptContent(inputJson, hashedPassword2);
        // const encryptedInputContent = `IV: ${inputIv}\nEncrypted Data: ${inputEncryptedData}`;

        // Ensure the "inputs" directory exists before writing the file
        if (!fs.existsSync(path.join(__dirname, '../inputs'))) {
            fs.mkdirSync(path.join(__dirname, '../inputs'));
        }

        // fs.writeFileSync(inputPath, encryptedInputContent);
        fs.writeFileSync(inputPath, inputJson);
        console.log(`Encrypted input file created at: ${inputPath}`);

        // Generate token
        const token = generateToken(user._id);
        
        // Return user token and Ethereum address
        res.status(201).json({ token, ethereumAddress: walletAddress });
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