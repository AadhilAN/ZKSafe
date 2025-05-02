const snarkjs = require("snarkjs");
const { ethers } = require("ethers");
//const { env } = require("../.env");
require("dotenv").config();
const verificationKey = require("../../ZKP/circuits/wallet_auth_circuit_js/wallet_auth_circuit_verification_key.json");

async function verifyProof(proof, publicSignals) {
    if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {
        throw new Error("Invalid proof format");
    }
    if (!publicSignals || !Array.isArray(publicSignals)) {
        throw new Error("Invalid publicSignals format");
    }

    const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
    return isValid ? "Proof is valid" : "Proof is invalid";
}

async function verifyProofOnchain(proof, publicSignals) {
    try {
        // Hardcode the contract address for now (or get from environment)
        const contractAddress = process.env.VERIFIER_ADDRESS;
        if (!contractAddress) throw new Error("Verifier contract address not configured");
        console.log("Using contract address:", contractAddress);

        // Initialize provider
        const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY || '151e8b37d18b4b8ebbadc74f189ddf2e'}`);

        // Update ABI to match your contract - note the uint[13] for public signals
        const abi = [
            "function verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[13] input) public view returns (bool)"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        // Format proof for on-chain verifier
        const a = [
            proof.pi_a[0],
            proof.pi_a[1]
        ];
        
        const b = [
            [
                proof.pi_b[0][1],
                proof.pi_b[0][0]
            ],
            [
                proof.pi_b[1][1],
                proof.pi_b[1][0]
            ]
        ];
        
        const c = [
            proof.pi_c[0],
            proof.pi_c[1]
        ];
        
        //check if the public signals are 13 in total
        const formattedPublicSignals = [];
        for (let i = 0; i < 13; i++) {
            if (i < publicSignals.length) {
                formattedPublicSignals.push(publicSignals[i]);
            } else {
                formattedPublicSignals.push("0");
            }
        }
        
        console.log("Formatted proof for on-chain verification:");
        console.log("a:", a);
        console.log("b:", b);
        console.log("c:", c);
        console.log("public signals:", formattedPublicSignals);
        
        // Call the verifier contract with all 13 public signals
        console.log(`Calling verifier at address ${contractAddress}...`);
        const result = await contract.callStatic.verifyProof(a, b, c, formattedPublicSignals);
        
        console.log("Verification result:", result);
        return result ? "Proof is valid (verified on-chain)" : "Proof is invalid (verified on-chain)";
    } catch (error) {
        console.error("On-chain verification error:", error);
        
        // Add more debug info
        console.log("Contract address:", process.env.VERIFIER_ADDRESS);
        console.log("RPC URL:", `https://sepolia.infura.io/v3/${process.env.INFURA_KEY || '151e8b37d18b4b8ebbadc74f189ddf2e'}`);
        
        throw new Error(`On-chain verification failed: ${error.message}`);
    }
}

// async function verifyProofOnchain(proof, publicSignals) {
//     try {
//         const contractAddress = process.env.VERIFIER_ADDRESS;
//         if (!contractAddress) throw new Error("Verifier contract address not configured");

//         // Initialize provider and wallet (if needed)
//         const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY || '151e8b37d18b4b8ebbadc74f189ddf2e'}`);

//         // Get the verifier contract ABI - you might need to adjust this to match your exact contract
//         const abi = [
//             "function verifyProof(uint[2] calldata a, uint[2][2] calldata b, uint[2] calldata c, uint[1] calldata input) external view returns (bool)"
//         ];
        
//         const contract = new ethers.Contract(contractAddress, abi, provider);
        
//         // Convert proof elements to strings to avoid any BigInt issues
//         const a = [
//             proof.pi_a[0].toString(),
//             proof.pi_a[1].toString(),
//             proof.pi_a[2].toString()
//         ];
        
//         // Groth16 verifiers often require pi_b in a specific format with points swapped
//         const b = [
//             [
//                 proof.pi_b[0][1].toString(),
//                 proof.pi_b[0][0].toString()
//             ],
//             [
//                 proof.pi_b[1][1].toString(), 
//                 proof.pi_b[1][0].toString()
//             ]
//         ];
        
//         const c = [
//             proof.pi_c[0].toString(),
//             proof.pi_c[1].toString()
//         ];
        
//         // For the public input, start by examining what the contract expects
//         // Usually it's only the first signal or a specific signal
//         let input;
        
//         // Log what we're seeing
//         console.log("Public signals:", publicSignals);
        
//         // Try the first public signal
//         input = [publicSignals[0].toString()];
        
//         console.log("Formatted proof components:");
//         console.log("a:", a);
//         console.log("b:", b);
//         console.log("c:", c);
//         console.log("input:", input);
        
//         // Call the contract
//         console.log(`Calling verifier at address ${contractAddress}...`);
//         const result = await contract.verifyProof(a, b, c, input);
//         console.log("Verification result:", result);
        
//         return result ? "Proof is valid (verified on-chain)" : "Proof is invalid (verified on-chain)";
//     } catch (error) {
//         console.error("On-chain verification error:", error);
        
//         // Add more debug info
//         console.log("Contract address:", process.env.VERIFIER_ADDRESS);
//         console.log("RPC URL:", `https://sepolia.infura.io/v3/${process.env.INFURA_KEY || '151e8b37d18b4b8ebbadc74f189ddf2e'}`);
        
//         throw new Error(`On-chain verification failed: ${error.message}`);
//     }
// }

// async function verifyProofOnchain(proof, publicSignals) {
//     try {
//         const contractAddress = process.env.VERIFIER_ADDRESS;
//         if (!contractAddress) throw new Error("Verifier contract address not configured");

//         const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY || '151e8b37d18b4b8ebbadc74f189ddf2e'}`);
        
//         // Get the actual ABI from your contract's build artifacts
//         const abi = [
//             "function verifyProof(uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c, uint256[1] memory input) public view returns (bool)"
//         ];
        
//         const contract = new ethers.Contract(contractAddress, abi, provider);
        
//         // Only keep the first public signal - most verifiers only expect a single hash
//         const formattedPublicInputs = [publicSignals[0]];
        
//         // Call the verification function directly with properly formatted arguments
//         const result = await contract.verifyProof(
//             [proof.pi_a[0], proof.pi_a[1]], 
//             [
//                 [proof.pi_b[0][1], proof.pi_b[0][0]], 
//                 [proof.pi_b[1][1], proof.pi_b[1][0]]
//             ], 
//             [proof.pi_c[0], proof.pi_c[1]], 
//             formattedPublicInputs
//         );
        
//         return result ? "Proof is valid (verified on-chain)" : "Proof is invalid (verified on-chain)";
//     } catch (error) {
//         console.error("On-chain verification error:", error);
//         throw new Error(`On-chain verification failed: ${error.message}`);
//     }
// }

module.exports = { verifyProof, verifyProofOnchain };