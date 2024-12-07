const { JsonRpcProvider, formatEther, parseEther, Wallet } = require('ethers');

const provider = new JsonRpcProvider('https://sepolia.infura.io/v3/151e8b37d18b4b8ebbadc74f189ddf2e');

// Get Balance
const getBalance = async (address) => {
    try {
        const balance = await provider.getBalance(address);
        return formatEther(balance); // Convert from Wei to Ether
    } catch (error) {
        throw new Error(`Failed to fetch balance: ${error.message}`);
    }
};

// Transfer Ether
const transferEther = async (privateKey, to, amount) => {
    try {
        const wallet = new Wallet(privateKey, provider); // Create wallet with private key
        const transaction = {
            to,
            value: parseEther(amount), // Convert amount to Wei
            gasLimit: 21000, // Standard gas limit for Ether transfers
        };

        const txResponse = await wallet.sendTransaction(transaction);
        await txResponse.wait(); // Wait for the transaction to be mined
        return txResponse;
    } catch (error) {
        throw new Error(`Transaction failed: ${error.message}`);
    }
};

module.exports = { getBalance, transferEther };