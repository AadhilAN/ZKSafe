const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');
const { decryptContent } = require('../utils/encryption');
const { JsonRpcProvider, formatEther, parseEther, Wallet } = require('ethers');
const { hash } = require('bcryptjs');
const wallet = require('../models/walletModel');

const provider = new JsonRpcProvider('https://sepolia.infura.io/v3/151e8b37d18b4b8ebbadc74f189ddf2e');

// Get Wallet Details


// const getPrivateKeyFromFile = async (email) => {
//     try {
//         const filePath = path.join(__dirname, '../keys', `${email}.txt`);
//         if (!fs.existsSync(filePath)) {
//             throw new Error('Encrypted file not found');
//         }

//         // Fetch the user's hashed password from the database
//         const user = await User.findOne({ email });
//         if (!user) {
//             throw new Error('User not found');
//         }

//         const hashedPassword = user.password;

//         // Read and parse the encrypted file
//         const fileContent = fs.readFileSync(filePath, 'utf-8');
//         const lines = fileContent.split('\n');
//         const ivLine = lines.find(line => line.startsWith('IV: '));
//         const encryptedDataLine = lines.find(line => line.startsWith('Encrypted Data: '));

//         if (!ivLine || !encryptedDataLine) {
//             throw new Error('Invalid file format');
//         }

//         const iv = ivLine.replace('IV: ', '').trim();
//         const encryptedData = encryptedDataLine.replace('Encrypted Data: ', '').trim();

//         // Decrypt the file content
//         const decryptedContent = decryptContent(encryptedData, iv, hashedPassword);

//         // Extract the private key from the decrypted content
//         const privateKeyLine = decryptedContent.split('\n').find(line => line.startsWith('Private Key: '));
//         if (!privateKeyLine) {
//             throw new Error('Private key not found in decrypted file');
//         }

//         return privateKeyLine.replace('Private Key: ', '').trim();
//     } catch (error) {
//         throw new Error(`Failed to decrypt private key: ${error.message}`);
//     }
// };


// Get Balance
const getBalance = async (walletAddress) => {
    try {

        const balance = await provider.getBalance(walletAddress);
        return { balance: formatEther(balance) }; // Convert from Wei to Ether
    } catch (error) {
        throw new Error(`Failed to fetch balance: ${error.message}`);
    }
};

//Transfer Ether
const transferEther = async (email, to, amount) => {
    try {
        const privateKey = await getPrivateKeyFromFile(email); // Read private key from file
        const wallet = new Wallet(privateKey, provider);

        const transaction = {
            to,
            value: parseEther(amount),
        };

        const txResponse = await wallet.sendTransaction(transaction);
        const receipt = await txResponse.wait();
        return receipt;
    } catch (error) {
        throw new Error(`Transaction failed: ${error.message}`);
    }
};

module.exports = { getBalance, transferEther };