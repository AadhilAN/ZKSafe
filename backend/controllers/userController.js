const circomlibjs = require("circomlibjs");
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../Services/userService');
const { encryptContent } = require('../utils/encryption');
const { verifyProof } = require('../Services/zkpService');

// // Utility function to generate challenge and expected response
// async function generateChallenge(identityCommitment) {
//   try {
//     // Generate a random challenge value (32 bytes converted to hex)
//     const challengeBuffer = Buffer.from(Array(32).fill().map(() => Math.floor(Math.random() * 256)));
//     const challengeValue = "0x" + challengeBuffer.toString('hex');
    
//     // Get current timestamp (in seconds)
//     const currentTimestamp = Math.floor(Date.now() / 1000);
    
//     // Calculate expected response using Poseidon(identityCommitment, currentTimestamp, challengeValue)
//     const poseidon = await circomlibjs.buildPoseidon();
    
//     // Convert inputs to field elements
//     const identityCommitmentBigInt = BigInt(identityCommitment);
//     const currentTimestampBigInt = BigInt(currentTimestamp);
//     const challengeValueBigInt = BigInt(challengeValue);
    
//     // Calculate the hash to get expected response
//     const expectedResponse = poseidon([
//       poseidon.F.e(identityCommitmentBigInt),
//       poseidon.F.e(currentTimestampBigInt),
//       poseidon.F.e(challengeValueBigInt)
//     ]);
    
//     // Convert to hex string
//     const expectedResponseHex = "0x" + poseidon.F.toString(expectedResponse);
    
//     return {
//       challengeValue,
//       expectedChallengeResponse: expectedResponseHex,
//       currentTimestamp,
//       // Calculate a reasonable max timestamp (1 hour in the future)
//       maxTimestamp: currentTimestamp + 3600
//     };
//   } catch (error) {
//     console.error("Error generating challenge:", error);
//     throw error;
//   }
// }


// Utility function to generate challenge and expected response
async function generateChallenge(identityCommitment) {
    try {
      // Generate a random challenge value (32 bytes converted to hex)
      const challengeBuffer = Buffer.from(Array(32).fill().map(() => Math.floor(Math.random() * 256)));
      const challengeValue = "0x" + challengeBuffer.toString('hex');
      
      // Get current timestamp (in seconds)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      // Calculate expected response using Poseidon(identityCommitment, currentTimestamp, challengeValue)
      const poseidon = await circomlibjs.buildPoseidon();
      
      // Convert inputs to field elements
      const identityCommitmentBigInt = BigInt(identityCommitment);
      const currentTimestampBigInt = BigInt(currentTimestamp);
      const challengeValueBigInt = BigInt(challengeValue);
      
      // Calculate the hash to get expected response
      const expectedResponse = poseidon([
        poseidon.F.e(identityCommitmentBigInt),
        poseidon.F.e(currentTimestampBigInt),
        poseidon.F.e(challengeValueBigInt)
      ]);
      
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

// Challenge generation endpoint - new required endpoint for challenge-response flow
exports.generateChallenge = async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    
    try {
        // Find user in database
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Generate challenge and expected response
        const challengeData = await generateChallenge(user.identityCommitment);
        
        // Return challenge data to client
        res.status(200).json({
            challengeValue: challengeData.challengeValue,
            currentTimestamp: challengeData.currentTimestamp,
            maxTimestamp: challengeData.maxTimestamp,
            // Define the security thresholds as per circuit requirements
            securityThreshold: 300, // 5 minutes in seconds
            minSecurityThreshold: 60, // 1 minute in seconds
            username: user.name, // Send the username for circuit input
            usernameHash: user.usernameHash,
            publicIdentityCommitment: user.identityCommitment,
            registeredSaltCommitment: user.saltCommitment,
            deviceCommitment: user.deviceCommitment,
            lastAuthTimestamp: user.lastAuthTimestamp
        });
        
        // Store challenge data in user record or separate collection to verify later
        user.currentChallenge = {
            challengeValue: challengeData.challengeValue,
            expectedChallengeResponse: challengeData.expectedChallengeResponse,
            timestamp: challengeData.currentTimestamp,
            expires: challengeData.maxTimestamp
        };
        await user.save();
        
    } catch (error) {
        console.error("Challenge generation error:", error);
        return res.status(500).json({ message: "Server error", details: error.message });
    }
};

// Login User with zk-SNARK Proof Verification
exports.login = async (req, res) => {
    const { email, password, password2, proof, publicSignals } = req.body;
    
    // Validate required fields
    if (!email || !password || !password2 || !proof || !publicSignals) {
        return res.status(400).json({ message: "All fields are required" });
    }
    
    try {
        // Find user in database
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Verify both passwords
        const isMatch1 = await bcrypt.compare(password, user.password);
        const isMatch2 = await bcrypt.compare(password2, user.password2);
        
        if (!isMatch1 || !isMatch2) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check if there's an active challenge
        if (!user.currentChallenge || 
            Math.floor(Date.now() / 1000) > user.currentChallenge.expires) {
            return res.status(400).json({ message: "Challenge expired or not found, please request a new one" });
        }
        
        // Extract values from publicSignals that will be verified (just isAuthenticated now)
        const [isAuthenticated] = publicSignals.slice(-1); // Last output
        
        // Validate proof against the circuit
        const proofValidation = await verifyProof(
            proof, 
            publicSignals, 
            // Additional public inputs needed by the verifier
            {
                username: user.name,
                usernameHash: user.usernameHash,
                publicIdentityCommitment: user.identityCommitment,
                registeredSaltCommitment: user.saltCommitment,
                deviceCommitment: user.deviceCommitment,
                lastAuthTimestamp: user.lastAuthTimestamp,
                currentTimestamp: user.currentChallenge.timestamp,
                maxTimestamp: user.currentChallenge.expires,
                challengeValue: user.currentChallenge.challengeValue,
                expectedChallengeResponse: user.currentChallenge.expectedChallengeResponse,
                securityThreshold: 300, // 5 minutes in seconds
                minSecurityThreshold: 60, // 1 minute in seconds
            }
        );
        
        if (proofValidation !== "Proof is valid") {
            return res.status(400).json({ message: "Invalid proof, login denied" });
        }
        
        // Now that the proof is verified, check if the authentication was successful
        if (isAuthenticated !== "1") {
            return res.status(400).json({ message: "Proof does not verify successful authentication" });
        }
        
        // Update the lastAuthTimestamp
        user.lastAuthTimestamp = user.currentChallenge.timestamp;
        
        // Clear the current challenge
        user.currentChallenge = null;
        
        await user.save();
        
        // Generate JWT Token
        const token = generateToken(user._id);
        
        return res.status(200).json({ 
            message: "Login successful", 
            token, 
            email
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Server error", details: error.message });
    }
};