pragma circom 2.0.0;

include "poseidon.circom"; // Include Poseidon hash function

template WalletOwnership() {
    signal input privateKey;          // Private key (provided by the prover)
    signal input walletAddress;       // Public wallet address (provided by the prover)
    signal output isValid;            // Output: 1 if proof is valid, 0 otherwise

    component hash = Poseidon(1);     // Instantiate Poseidon hash function
    hash.inputs[0] <== privateKey;    // Hash the private key

    // Calculate difference
    signal diff;
    diff <== hash.out - walletAddress;

    // Ensure diff is zero
    isValid <== 1 - diff * diff; // diff == 0 <=> diff * diff == 0
}

// Define the main component
component main = WalletOwnership();
