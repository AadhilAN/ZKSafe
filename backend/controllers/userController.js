const circomlibjs = require("circomlibjs");
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../Services/userService');
const { encryptContent } = require('../utils/encryption');
const { verifyProof } = require('../Services/zkpService'); // Import zk-SNARK proof verification

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

        // Generate Ethereum Wallet
        // const wallet = ethers.Wallet.createRandom();
        // const walletAddress = wallet.address;
        // const privateKey = wallet.privateKey;

        // console.log("Private Key: ", privateKey);
        // console.log("Public Key: ", walletAddress);
        
        // Create new Wallet
        const wallet = new Wallet({ publicKey, walletAddress });
        await wallet.save();

        // Create a new user
        const user = new User({ name, email, password, password2, walletID: wallet._id, usernameHash, saltCommitment, identityCommitment, deviceCommitment, lastAuthTimestamp });
        await user.save();
        
        // const hashedPassword = user.password;
        // const hashedPassword2 = user.password2;

        // Write private key to an encrypted file
        // const fileContent = `Your Ethereum Wallet Details:\n\nPublic Address: ${walletAddress}\nPrivate Key: ${privateKey}\n\nKeep this file secure and do not share it with anyone!`;
        // const { iv: txtIv, encryptedData: txtEncryptedData } = encryptContent(fileContent, hashedPassword);
        // const filePath = path.join(__dirname, '../keys', `${email}.txt`);
        // const encryptedFileContent = `IV: ${txtIv}\nEncrypted Data: ${txtEncryptedData}`;

        // if (!fs.existsSync(path.join(__dirname, '../keys'))) {
        //     fs.mkdirSync(path.join(__dirname, '../keys'));
        // }
        // fs.writeFileSync(filePath, encryptedFileContent);
        // console.log(`Encrypted private key saved to file: ${filePath}`);

        // Create and store the input.json file
        // const inputContent = {
        //     privateKey,
        //     walletAddress
        // };
        // const inputPath = path.join(__dirname, '../inputs', `${email}_input.json`);
        // const inputJson = JSON.stringify(inputContent, null, 2);

        // if (!fs.existsSync(path.join(__dirname, '../inputs'))) {
        //     fs.mkdirSync(path.join(__dirname, '../inputs'));
        // }
        // fs.writeFileSync(inputPath, inputJson);
        // console.log(`Input file created at: ${inputPath}`);

        // const newWallet = new Wallet({
        //     userId: user._id,
        //     publicKey: walletAddress,
        //     encryptedFilePath: filePath
        // });
        // await newWallet.save();

        // user.walletId = newWallet._id;
        // await user.save();

        // Generate token
        const token = generateToken(user._id);
        
        // Return user token and Ethereum address
        res.status(201).json({ token, ethereumAddress: walletAddress });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login User with zk-SNARK Proof Verification
exports.login = async (req, res) => {
    const { email, password, password2, proof, publicSignals } = req.body;

    try {
        // Find user in database
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify both passwords
        const isMatch1 = await bcrypt.compare(password, user.password);
        const isMatch2 = await bcrypt.compare(password2, user.password2);
        const publicSignal = JSON.parse(req.body.publicSignals);
        
        if (!isMatch1 || !isMatch2) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Retrieve wallet address from user data
        // const storedWalletAddress = user.ethereumAddress;
        // const poseidon = await circomlibjs.buildPoseidon();
        // const walletHash = poseidon.F.toString(poseidon([storedWalletAddress]));

        // console.log("storedWalletAddress: ", storedWalletAddress);
        // console.log("walletHash: ", walletHash);
        console.log("publicSignals", publicSignal);
        console.log("proof sent by client", proof);

        // Validate proof
        const proofValidation = await verifyProof(proof, publicSignal);
        console.log("Proof status is: ", proofValidation);
        if (proofValidation !== "Proof is valid") {
            return res.status(400).json({ message: "Invalid proof, login denied" });
        }

        // Generate JWT Token
        const token = generateToken(user._id);

        return res.status(200).json({ message: "Login successful", token , email});
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Server error", details: error.message });
    }
};
