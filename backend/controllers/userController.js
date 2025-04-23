const circomlibjs = require("circomlibjs");
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../Services/userService');
const { calculateHash } = require('../Services/poseidonService');
const { encryptContent } = require('../utils/encryption');
const { verifyProof } = require('../Services/zkpService');

// Utility function to generate challenge and expected response
async function generateChallenge(identityCommitment) {
    try {
        // Generate a random challenge value (32 bytes converted to hex)
        const challengeBuffer = Buffer.from(Array(32).fill().map(() => Math.floor(Math.random() * 256)));
        const challengeValue = "0x" + challengeBuffer.toString('hex');
        console.log("Challenge Value: ", challengeValue);

        // Get current timestamp (in seconds)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        // Calculate expected response using Poseidon(identityCommitment, currentTimestamp, challengeValue)
        const poseidon = await circomlibjs.buildPoseidon();
        
        // Convert inputs to field elements
        const identityCommitmentBigInt = BigInt(identityCommitment);
        const currentTimestampBigInt = BigInt(currentTimestamp);
        const challengeValueBigInt = BigInt(challengeValue);

        console.log("Identity Commitment Bgint: ", identityCommitmentBigInt);
        console.log("Current Time Bgint: ", currentTimestampBigInt);
        console.log("Challenge value Bgint: ", challengeValueBigInt);
        // console.log("Identity Commitment FieldE: ", poseidon.F.e(identityCommitmentBigInt));
        // console.log("Current Time FieldE: ", poseidon.F.e(currentTimestampBigInt));
        // console.log("Challenge value FieldE: ", poseidon.F.e(challengeValueBigInt));
        
        // Calculate the hash to get expected response
        // const expectedResponse = poseidon([
        //     poseidon.F.e(identityCommitmentBigInt),
        //     poseidon.F.e(currentTimestampBigInt),
        //     poseidon.F.e(challengeValueBigInt)
        // ]);

        const expectedResponse = calculateHash([identityCommitmentBigInt, currentTimestampBigInt, challengeValueBigInt]);
        
        // Convert to hex string
        const expectedResponseHex = "0x" + poseidon.F.toString(expectedResponse);
        
        return {
            challengeValue,
            expectedChallengeResponse: expectedResponseHex,
            currentTimestamp,
            // Calculate a reasonable max timestamp (1 hour in the future)
            maxTimestamp: currentTimestamp + 3600
        };
    } catch (error) {
        console.error("Error generating challenge:", error);
        throw error;
    }
}

// Register User
exports.register = async (req, res) => {
    const { name, email, password, password2, walletAddress, publicKey, usernameHash, saltCommitment, identityCommitment, deviceCommitment, lastAuthTimestamp} = req.body;
    console.log("Registering user with data: ", req.body);
    if (!name || !email || !password || !password2 || !walletAddress || !publicKey || !usernameHash || !saltCommitment || !identityCommitment || !deviceCommitment || !lastAuthTimestamp) {
        return res.status(400).json({ message: "All fields are required" });
    }
    if (password === password2) {
        return res.status(400).json({ message: "Password and Password2 should not be the same" });
    }
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });
        
        // Create new Wallet
        const wallet = new Wallet({ publicKey, walletAddress });
        await wallet.save();
        
        // Create a new user
        const user = new User({ 
            name, 
            email, 
            password, 
            password2, 
            walletID: wallet._id, 
            usernameHash, 
            saltCommitment, 
            identityCommitment, 
            deviceCommitment, 
            lastAuthTimestamp
        });
        await user.save();
        
        // Generate token
        const token = generateToken(user._id);
        
        // Return user token and Ethereum address
        res.status(201).json({ token, ethereumAddress: walletAddress });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Phase 1: Initiate Login - Verify credentials and generate challenge
exports.initiateLogin = async (req, res) => {
    const { email, password, password2 } = req.body;
    
    // Validate required fields
    if (!email || !password || !password2) {
        return res.status(400).json({ message: "All fields are required" });
    }
    
    try {
        // Find user in database
        const user = await User.findOne({ email });
        // console.log(email);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Verify both passwords
        const isMatch1 = await bcrypt.compare(password, user.password);
        const isMatch2 = await bcrypt.compare(password2, user.password2);
        
        if (!isMatch1 || !isMatch2) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Generate challenge and expected response
        const challengeData = await generateChallenge(user.identityCommitment);
        
        // Store challenge data in user record
        user.currentChallenge = {
            challengeValue: challengeData.challengeValue,
            expectedChallengeResponse: challengeData.expectedChallengeResponse,
            timestamp: challengeData.currentTimestamp,
            expires: challengeData.maxTimestamp
        };
        await user.save();

        // IMPORTANT: For the ZK circuit, we need to use the SAME username hash value
        // that was registered originally, not compute a new one
        // This ensures consistency with the stored values
        
        // Return challenge data and necessary public inputs to client
        res.status(200).json({
            // Challenge data
            challengeValue: challengeData.challengeValue,
            currentTimestamp: challengeData.currentTimestamp,
            maxTimestamp: challengeData.maxTimestamp,
            
            // Circuit public inputs - use the stored hash values directly
            usernameHash: user.usernameHash,
            username: user.name,
            publicIdentityCommitment: user.identityCommitment,
            registeredSaltCommitment: user.saltCommitment,
            deviceCommitment: user.deviceCommitment,
            lastAuthTimestamp: Math.floor(user.lastAuthTimestamp.getTime() / 1000), // Convert Date to timestamp
            
            // Security thresholds
            securityThreshold: 300, // 5 minutes in seconds
            minSecurityThreshold: 60, // 1 minute in seconds
            
            // Expected response - store this on server but don't send to client in real implementation
            // Only included here for debugging/development purposes
            expectedChallengeResponse: challengeData.expectedChallengeResponse
        });
        console.log("Username: ", user.name);
        console.log("Username Hash: ", user.usernameHash);
        
    } catch (error) {
        console.error("Login initiation error:", error);
        return res.status(500).json({ message: "Server error", details: error.message });
    }
};

// Phase 2: Complete Login - Verify proof and issue token
exports.completeLogin = async (req, res) => {
    const { email, proof, publicSignals } = req.body;
    
    // Validate required fields
    if (!email || !proof || !publicSignals) {
        return res.status(400).json({ message: "All fields are required" });
        
    }
    
    try {
        // Find user in database
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const expires = Math.floor(Date.now() / 1000);
        const challengeValue = Math.floor(Date.now() / 1000);
        const expectedChallengeResponse = Math.floor(Date.now() / 1000);
        
        // // Check if there's an active challenge
        // if (!user.currentChallenge || 
        //     Math.floor(Date.now() / 1000) > user.currentChallenge.expires) {
        //     return res.status(400).json({ message: "Challenge expired or not found, please request a new one" });
        // }
        
        // Extract values from publicSignals that will be verified (just isAuthenticated now)
        const isAuthenticated = publicSignals[publicSignals.length - 1]; // Last output
        
        // Validate proof against the circuit
        const proofValidation = await verifyProof(
            proof, 
            publicSignals, 
            // Additional public inputs needed by the verifier
            {
                // Use stored values directly
                usernameHash: user.usernameHash,
                publicIdentityCommitment: user.identityCommitment,
                registeredSaltCommitment: user.saltCommitment,
                deviceCommitment: user.deviceCommitment,
                lastAuthTimestamp: Math.floor(user.lastAuthTimestamp.getTime() / 1000),
                currentTimestamp: currentTimestamp,
                maxTimestamp: expires,
                challengeValue: challengeValue,
                expectedChallengeResponse: expectedChallengeResponse,
                securityThreshold: 300, // 5 minutes in seconds
                minSecurityThreshold: 60, // 1 minute in seconds
            }
        );
        
        if (proofValidation !== "Proof is valid") {
            console.log("Proof validation failed:", proofValidation);
            return res.status(400).json({ message: "Invalid proof, login denied" });
        }
        
        // Now that the proof is verified, check if the authentication was successful
        if (isAuthenticated !== "1") {
            return res.status(400).json({ message: "Proof does not verify successful authentication" });
        }
        
        // Update the lastAuthTimestamp
        //user.lastAuthTimestamp = new Date(user.currentChallenge.timestamp * 1000);
        
        // Clear the current challenge
        //user.currentChallenge = null;
        console.log("Proof validation successful, updating user record: ",proofValidation);
        
        await user.save();
        
        // Generate JWT Token
        const token = generateToken(user._id);
        
        return res.status(200).json({ 
            message: "Login successful", 
            token, 
            email
        });
    } catch (error) {
        console.error("Login completion error:", error);
        return res.status(500).json({ message: "Server error", details: error.message });
    }
};

