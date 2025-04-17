pragma circom 2.0.0;

include "poseidon.circom"; // Include Poseidon hash function

template WalletOwnership() {
    // Private inputs
    signal input keyShare;       // User's key share instead of full private key (secret)
    signal input userSalt;       // User-specific salt (secret)
    signal input deviceId;       // ID of the device being used (secret)
    
    // Public inputs (visible to verifier)
    signal input username;                 // Username/identifier (public)
    signal input usernameHash;             // Hash of registered username (public)
    signal input publicIdentityCommitment; // Registered identity commitment
    signal input registeredSaltCommitment; // Salt commitment for this username
    signal input deviceCommitment;         // Registered device commitment
    signal input lastAuthTimestamp;        // Last successful auth timestamp
    signal input currentTimestamp;         // Current server timestamp (public)
    signal input maxTimestamp;             // Maximum reasonable timestamp
    signal input challengeValue;           // Server-provided challenge
    signal input expectedChallengeResponse; // Expected response to challenge
    signal input securityThreshold;        // Time threshold for rate limiting (public)
    signal input minSecurityThreshold;     // Minimum allowed threshold to prevent rate limit bypass
    signal output isValid;            // Output: 1 if proof is valid, 0 otherwise

    component hash = Poseidon(1);     // Instantiate Poseidon hash function
    hash.inputs[0] <== username;    // Hash the private key

    // Calculate difference
    signal diff;
    diff <== hash.out - usernameHash;

    // Ensure diff is zero
    isValid <== 1 - diff * diff; // diff == 0 <=> diff * diff == 0
}

// Define the main component
component main = WalletOwnership();
