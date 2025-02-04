const snarkjs = require("snarkjs");
const verificationKey = require("../../ZKP/compiled/verification_key.json");

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

// async function verifyProof(proof, publicSignals) {
//     const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
//     return isValid ? "Proof is valid" : "Proof is invalid";
// }

module.exports = { verifyProof };